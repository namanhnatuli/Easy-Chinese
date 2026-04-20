-- ==========================================
-- FIX: Ambiguous column references in apply_vocab_sync_row
-- ==========================================

create or replace function public.apply_vocab_sync_row(
  p_sync_row_id uuid,
  p_target_word_id uuid default null,
  p_new_slug text default null,
  p_content_hash text default null,
  p_applied_by uuid default auth.uid()
)
returns table (
  sync_row_id uuid,
  word_id uuid,
  operation text,
  apply_status public.vocab_sync_apply_status,
  error_message text,
  audit_event_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vocab_sync_rows%rowtype;
  v_payload jsonb;
  v_now timestamptz := timezone('utc', now());
  v_word_id uuid := p_target_word_id;
  v_operation text := 'update';
  v_error_message text;
  v_audit_id uuid;
  v_text_value text;
  v_input_text text;
  v_normalized_text text;
  v_pinyin text;
  v_meanings_vi text;
  v_han_viet text;
  v_traditional_variant text;
  v_hsk_level integer;
  v_part_of_speech text;
  v_component_breakdown_json jsonb;
  v_radical_summary text;
  v_character_structure_type text;
  v_structure_explanation text;
  v_mnemonic text;
  v_notes text;
  v_ambiguity_flag boolean := false;
  v_ambiguity_note text;
  v_reading_candidates text;
  v_review_status public.vocab_review_status := 'applied';
  v_ai_status public.vocab_ai_status := 'pending';
  v_source_confidence public.source_confidence_level;
  v_source_updated_at timestamptz;
  v_main_radical_id uuid;
  v_missing_radicals text;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    return query
      select p_sync_row_id, null::uuid, 'failed'::text, 'failed'::public.vocab_sync_apply_status, 'Only admins may apply sync rows.'::text, null::uuid;
    return;
  end if;

  select *
  into v_row
  from public.vocab_sync_rows
  where id = p_sync_row_id
  for update;

  if not found then
    return query
      select p_sync_row_id, null::uuid, 'failed'::text, 'failed'::public.vocab_sync_apply_status, 'Sync row not found.'::text, null::uuid;
    return;
  end if;

  if v_row.review_status not in ('approved', 'applied') then
    update public.vocab_sync_rows as vsr
    set
      apply_status = 'failed',
      error_message = 'Only approved rows can be applied.'
    where vsr.id = v_row.id;

    insert into public.vocab_sync_apply_events (
      sync_row_id,
      batch_id,
      word_id,
      operation,
      status,
      payload_snapshot,
      error_message,
      applied_by,
      applied_at
    )
    values (
      v_row.id,
      v_row.batch_id,
      v_row.applied_word_id,
      'failed',
      'failed',
      coalesce(v_row.admin_edited_payload, v_row.normalized_payload, '{}'::jsonb),
      'Only approved rows can be applied.',
      coalesce(p_applied_by, v_row.approved_by),
      v_now
    )
    returning id into v_audit_id;

    return query
      select v_row.id, v_row.applied_word_id, 'failed'::text, 'failed'::public.vocab_sync_apply_status, 'Only approved rows can be applied.'::text, v_audit_id;
    return;
  end if;

  if v_row.apply_status = 'applied' and v_row.applied_word_id is not null then
    return query
      select v_row.id, v_row.applied_word_id, 'skipped'::text, 'applied'::public.vocab_sync_apply_status, null::text, null::uuid;
    return;
  end if;

  v_payload := coalesce(v_row.admin_edited_payload, v_row.normalized_payload, '{}'::jsonb);

  begin
    v_text_value := nullif(trim(v_payload ->> 'inputText'), '');
    v_input_text := v_text_value;
    v_normalized_text := coalesce(nullif(trim(v_payload ->> 'normalizedText'), ''), v_input_text);
    v_input_text := coalesce(v_input_text, v_normalized_text);
    v_pinyin := nullif(trim(v_payload ->> 'pinyin'), '');
    v_meanings_vi := nullif(trim(v_payload ->> 'meaningsVi'), '');
    v_han_viet := nullif(trim(v_payload ->> 'hanViet'), '');
    v_traditional_variant := nullif(trim(v_payload ->> 'traditionalVariant'), '');
    v_part_of_speech := nullif(trim(v_payload ->> 'partOfSpeech'), '');
    v_radical_summary := nullif(trim(v_payload ->> 'radicalSummary'), '');
    v_character_structure_type := nullif(trim(v_payload ->> 'characterStructureType'), '');
    v_structure_explanation := nullif(trim(v_payload ->> 'structureExplanation'), '');
    v_mnemonic := nullif(trim(v_payload ->> 'mnemonic'), '');
    v_notes := nullif(trim(v_payload ->> 'notes'), '');
    v_ambiguity_flag := coalesce((v_payload ->> 'ambiguityFlag')::boolean, false);
    v_ambiguity_note := nullif(trim(v_payload ->> 'ambiguityNote'), '');
    v_reading_candidates := nullif(trim(v_payload ->> 'readingCandidates'), '');
    v_component_breakdown_json := coalesce(v_payload -> 'componentBreakdownJson', 'null'::jsonb);

    if nullif(trim(v_payload ->> 'hskLevel'), '') is not null then
      v_hsk_level := (v_payload ->> 'hskLevel')::integer;
    end if;

    if nullif(trim(v_payload ->> 'reviewStatus'), '') is not null then
      v_review_status := (v_payload ->> 'reviewStatus')::public.vocab_review_status;
    end if;

    if nullif(trim(v_payload ->> 'aiStatus'), '') is not null then
      v_ai_status := (v_payload ->> 'aiStatus')::public.vocab_ai_status;
    end if;

    if nullif(trim(v_payload ->> 'sourceConfidence'), '') is not null then
      v_source_confidence := (v_payload ->> 'sourceConfidence')::public.source_confidence_level;
    end if;

    if nullif(trim(v_payload ->> 'sourceUpdatedAt'), '') is not null then
      v_source_updated_at := (v_payload ->> 'sourceUpdatedAt')::timestamptz;
    else
      v_source_updated_at := v_row.source_updated_at;
    end if;

    if v_normalized_text is null then
      raise exception 'normalizedText is required in the approved payload.';
    end if;

    if v_pinyin is null then
      raise exception 'pinyin is required in the approved payload.';
    end if;

    if v_meanings_vi is null then
      raise exception 'meaningsVi is required in the approved payload.';
    end if;

    if p_content_hash is null or length(trim(p_content_hash)) = 0 then
      raise exception 'content hash is required before apply.';
    end if;

    if v_word_id is null and v_row.external_id is not null then
      select w.id
      into v_word_id
      from public.words as w
      where w.external_source = v_row.external_source
        and w.external_id = v_row.external_id
      limit 1;
    end if;

    if v_word_id is null and v_row.source_row_key is not null then
      select w.id
      into v_word_id
      from public.words as w
      where w.external_source = v_row.external_source
        and w.source_row_key = v_row.source_row_key
      limit 1;
    end if;

    with desired_radicals as (
      select
        trim(value) as requested_radical,
        min(ord::integer) as sort_order
      from jsonb_array_elements_text(coalesce(v_payload -> 'mainRadicals', '[]'::jsonb)) with ordinality as elements(value, ord)
      where nullif(trim(value), '') is not null
      group by trim(value)
    ),
    matched_radicals as (
      select
        desired_radicals.requested_radical,
        desired_radicals.sort_order,
        min(r.id::text)::uuid as radical_id
      from desired_radicals
      left join lateral (
        select lower(trim(alias_value)) as alias
        from (
          values
            (desired_radicals.requested_radical),
            (nullif(trim((regexp_match(desired_radicals.requested_radical, '^(.*?)\s*\(([^)]+)\)\s*$'))[1]), '')),
            (nullif(trim((regexp_match(desired_radicals.requested_radical, '^(.*?)\s*\(([^)]+)\)\s*$'))[2]), ''))
        ) as aliases(alias_value)
        where alias_value is not null
          and alias_value <> ''
      ) desired_aliases on true
      left join public.radicals as r on
        lower(trim(r.radical)) = desired_aliases.alias
        or lower(trim(coalesce(r.display_label, ''))) = desired_aliases.alias
        or lower(trim(coalesce(r.han_viet_name, ''))) = desired_aliases.alias
        or lower(trim(coalesce(r.meaning_vi, ''))) = desired_aliases.alias
        or exists (
          select 1
          from unnest(coalesce(r.variant_forms, array[]::text[])) as variants(variant_value)
          where lower(trim(variant_value)) = desired_aliases.alias
        )
      group by desired_radicals.requested_radical, desired_radicals.sort_order
    )
    select string_agg(requested_radical, ', ' order by sort_order)
    into v_missing_radicals
    from matched_radicals
    where radical_id is null;

    if v_missing_radicals is not null then
      raise exception 'Missing radical mappings: %', v_missing_radicals;
    end if;

    if v_word_id is null then
      if p_new_slug is null or length(trim(p_new_slug)) = 0 then
        raise exception 'A slug is required when creating a new word.';
      end if;

      insert into public.words (
        slug,
        simplified,
        traditional,
        hanzi,
        pinyin,
        han_viet,
        vietnamese_meaning,
        external_source,
        external_id,
        source_row_key,
        normalized_text,
        meanings_vi,
        traditional_variant,
        hsk_level,
        part_of_speech,
        component_breakdown_json,
        radical_summary,
        mnemonic,
        character_structure_type,
        structure_explanation,
        notes,
        ambiguity_flag,
        ambiguity_note,
        reading_candidates,
        review_status,
        ai_status,
        source_confidence,
        content_hash,
        last_synced_at,
        last_source_updated_at,
        is_published,
        created_by
      )
      values (
        trim(p_new_slug),
        v_input_text,
        v_traditional_variant,
        v_input_text,
        v_pinyin,
        v_han_viet,
        v_meanings_vi,
        v_row.external_source,
        v_row.external_id,
        v_row.source_row_key,
        v_normalized_text,
        v_meanings_vi,
        v_traditional_variant,
        v_hsk_level,
        v_part_of_speech,
        v_component_breakdown_json,
        v_radical_summary,
        v_mnemonic,
        v_character_structure_type,
        v_structure_explanation,
        v_notes,
        v_ambiguity_flag,
        v_ambiguity_note,
        v_reading_candidates,
        'applied',
        v_ai_status,
        v_source_confidence,
        p_content_hash,
        v_now,
        v_source_updated_at,
        false,
        coalesce(p_applied_by, v_row.approved_by)
      )
      returning id into v_word_id;

      v_operation := 'insert';
    else
      update public.words as w
      set
        simplified = v_input_text,
        traditional = v_traditional_variant,
        hanzi = v_input_text,
        pinyin = v_pinyin,
        han_viet = v_han_viet,
        vietnamese_meaning = v_meanings_vi,
        external_source = v_row.external_source,
        external_id = v_row.external_id,
        source_row_key = v_row.source_row_key,
        normalized_text = v_normalized_text,
        meanings_vi = v_meanings_vi,
        traditional_variant = v_traditional_variant,
        hsk_level = coalesce(v_hsk_level, w.hsk_level),
        part_of_speech = v_part_of_speech,
        component_breakdown_json = v_component_breakdown_json,
        radical_summary = v_radical_summary,
        mnemonic = v_mnemonic,
        character_structure_type = v_character_structure_type,
        structure_explanation = v_structure_explanation,
        notes = v_notes,
        ambiguity_flag = v_ambiguity_flag,
        ambiguity_note = v_ambiguity_note,
        reading_candidates = v_reading_candidates,
        review_status = 'applied',
        ai_status = v_ai_status,
        source_confidence = v_source_confidence,
        content_hash = p_content_hash,
        last_synced_at = v_now,
        last_source_updated_at = v_source_updated_at
      where w.id = v_word_id;

      if not found then
        raise exception 'Target word % could not be updated.', v_word_id;
      end if;
    end if;

    delete from public.word_examples as we
    where we.word_id = v_word_id;

    insert into public.word_examples (
      word_id,
      chinese_text,
      pinyin,
      vietnamese_meaning,
      sort_order
    )
    select
      v_word_id,
      trim(example.value ->> 'chineseText'),
      nullif(trim(example.value ->> 'pinyin'), ''),
      trim(example.value ->> 'vietnameseMeaning'),
      coalesce(nullif(trim(example.value ->> 'sortOrder'), '')::integer, example.ord::integer)
    from jsonb_array_elements(coalesce(v_payload -> 'examples', '[]'::jsonb)) with ordinality as example(value, ord)
    where nullif(trim(example.value ->> 'chineseText'), '') is not null
      and nullif(trim(example.value ->> 'vietnameseMeaning'), '') is not null;

    with desired_tags as (
      select
        trim(value) as slug,
        min(ord::integer) as sort_order
      from jsonb_array_elements_text(coalesce(v_payload -> 'topicTags', '[]'::jsonb)) with ordinality as elements(value, ord)
      where nullif(trim(value), '') is not null
      group by trim(value)
    )
    insert into public.word_tags (slug, label)
    select
      desired_tags.slug,
      initcap(replace(replace(desired_tags.slug, '_', ' '), '-', ' '))
    from desired_tags
    on conflict (slug) do nothing;

    delete from public.word_tag_links as wtl
    where wtl.word_id = v_word_id;

    insert into public.word_tag_links (word_id, word_tag_id)
    select
      v_word_id,
      wt.id
    from public.word_tags as wt
    join (
      select distinct trim(value) as slug
      from jsonb_array_elements_text(coalesce(v_payload -> 'topicTags', '[]'::jsonb)) as elements(value)
      where nullif(trim(value), '') is not null
    ) desired_tags on desired_tags.slug = wt.slug;

    delete from public.word_radicals as wr
    where wr.word_id = v_word_id;

    with desired_radicals as (
      select
        trim(value) as requested_radical,
        min(ord::integer) as sort_order
      from jsonb_array_elements_text(coalesce(v_payload -> 'mainRadicals', '[]'::jsonb)) with ordinality as elements(value, ord)
      where nullif(trim(value), '') is not null
      group by trim(value)
    ),
    matched_radicals as (
      select
        desired_radicals.requested_radical,
        desired_radicals.sort_order,
        min(rads.id::text)::uuid as radical_id
      from desired_radicals
      left join lateral (
        select lower(trim(alias_value)) as alias
        from (
          values
            (desired_radicals.requested_radical),
            (nullif(trim((regexp_match(desired_radicals.requested_radical, '^(.*?)\s*\(([^)]+)\)\s*$'))[1]), '')),
            (nullif(trim((regexp_match(desired_radicals.requested_radical, '^(.*?)\s*\(([^)]+)\)\s*$'))[2]), ''))
        ) as aliases(alias_value)
        where alias_value is not null
          and alias_value <> ''
      ) desired_aliases on true
      left join public.radicals as rad on
        lower(trim(rad.radical)) = desired_aliases.alias
        or lower(trim(coalesce(rad.display_label, ''))) = desired_aliases.alias
        or lower(trim(coalesce(rad.han_viet_name, ''))) = desired_aliases.alias
        or lower(trim(coalesce(rad.meaning_vi, ''))) = desired_aliases.alias
        or exists (
          select 1
          from unnest(coalesce(rad.variant_forms, array[]::text[])) as variants(variant_value)
          where lower(trim(variant_value)) = desired_aliases.alias
        )
      group by desired_radicals.requested_radical, desired_radicals.sort_order
    )
    insert into public.word_radicals (
      word_id,
      radical_id,
      is_main,
      sort_order
    )
    select
      v_word_id,
      matched_radicals.radical_id,
      matched_radicals.sort_order = 1,
      matched_radicals.sort_order - 1
    from matched_radicals
    where matched_radicals.radical_id is not null
    order by matched_radicals.sort_order;

    select wr.radical_id
    into v_main_radical_id
    from public.word_radicals as wr
    where wr.word_id = v_word_id
      and wr.is_main = true
    limit 1;

    update public.words as w
    set radical_id = v_main_radical_id
    where w.id = v_word_id;

    update public.vocab_sync_rows as vsr
    set
      review_status = 'applied',
      apply_status = 'applied',
      applied_word_id = v_word_id,
      applied_by = coalesce(p_applied_by, v_row.approved_by),
      applied_at = v_now,
      error_message = null
    where vsr.id = v_row.id;

    insert into public.vocab_sync_apply_events (
      sync_row_id,
      batch_id,
      word_id,
      operation,
      status,
      payload_snapshot,
      result_snapshot,
      applied_by,
      applied_at
    )
    values (
      v_row.id,
      v_row.batch_id,
      v_word_id,
      v_operation,
      'applied',
      v_payload,
      jsonb_build_object(
        'wordId', v_word_id,
        'slug', coalesce(p_new_slug, (select slug from public.words where id = v_word_id)),
        'sourceRowKey', v_row.source_row_key,
        'externalId', v_row.external_id,
        'contentHash', p_content_hash,
        'appliedAt', v_now
      ),
      coalesce(p_applied_by, v_row.approved_by),
      v_now
    )
    returning id into v_audit_id;

    return query
      select v_row.id, v_word_id, v_operation, 'applied'::public.vocab_sync_apply_status, null::text, v_audit_id;
  exception
    when others then
      v_error_message := sqlerrm;

      update public.vocab_sync_rows as vsr
      set
        apply_status = 'failed',
        error_message = v_error_message
      where vsr.id = v_row.id;

      insert into public.vocab_sync_apply_events (
        sync_row_id,
        batch_id,
        word_id,
        operation,
        status,
        payload_snapshot,
        error_message,
        applied_by,
        applied_at
      )
      values (
        v_row.id,
        v_row.batch_id,
        case when v_operation = 'insert' then null else v_word_id end,
        'failed',
        'failed',
        v_payload,
        v_error_message,
        coalesce(p_applied_by, v_row.approved_by),
        v_now
      )
      returning id into v_audit_id;

      return query
        select v_row.id, v_word_id, 'failed'::text, 'failed'::public.vocab_sync_apply_status, v_error_message, v_audit_id;
  end;
end;
$$;

grant execute on function public.apply_vocab_sync_row(uuid, uuid, text, text, uuid) to authenticated;
