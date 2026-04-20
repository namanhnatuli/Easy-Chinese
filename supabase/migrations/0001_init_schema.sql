-- ==========================================
-- 0001_INIT_SCHEMA.SQL
-- Consolidated baseline schema for Chinese Learning App
-- ==========================================

-- 1. EXTENSIONS
create extension if not exists pgcrypto with schema extensions;

-- 2. CUSTOM TYPES
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'admin');
  end if;
  
  if not exists (select 1 from pg_type where typname = 'progress_status') then
    create type public.progress_status as enum ('new', 'learning', 'review', 'mastered');
  end if;

  if not exists (select 1 from pg_type where typname = 'review_mode') then
    create type public.review_mode as enum ('flashcard', 'multiple_choice', 'typing');
  end if;

  if not exists (select 1 from pg_type where typname = 'review_result') then
    create type public.review_result as enum ('correct', 'incorrect', 'skipped');
  end if;

  if not exists (select 1 from pg_type where typname = 'source_confidence_level') then
    create type public.source_confidence_level as enum ('low', 'medium', 'high');
  end if;

  if not exists (select 1 from pg_type where typname = 'vocab_review_status') then
    create type public.vocab_review_status as enum ('pending', 'needs_review', 'approved', 'rejected', 'applied');
  end if;

  if not exists (select 1 from pg_type where typname = 'vocab_ai_status') then
    create type public.vocab_ai_status as enum ('pending', 'processing', 'done', 'failed', 'skipped');
  end if;

  if not exists (select 1 from pg_type where typname = 'vocab_sync_batch_status') then
    create type public.vocab_sync_batch_status as enum ('pending', 'running', 'completed', 'failed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'vocab_sync_change_kind') then
    create type public.vocab_sync_change_kind as enum ('new', 'changed', 'unchanged', 'conflict', 'invalid');
  end if;

  if not exists (select 1 from pg_type where typname = 'vocab_sync_apply_status') then
    create type public.vocab_sync_apply_status as enum ('pending', 'applied', 'failed', 'skipped');
  end if;
end
$$;

-- 3. CORE TABLES

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  role public.app_role not null default 'user',
  preferred_language text not null default 'en',
  preferred_theme text not null default 'system',
  preferred_font text not null default 'sans',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_preferred_theme_check check (preferred_theme in ('light', 'dark', 'system')),
  constraint profiles_preferred_font_check check (preferred_font in ('sans', 'serif', 'kai'))
);

-- Topics
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Word Tags
create table public.word_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Radicals
create table public.radicals (
  id uuid primary key default gen_random_uuid(),
  radical text not null unique,
  meaning_vi text not null,
  stroke_count integer not null check (stroke_count >= 0),
  display_label text,
  han_viet_name text,
  variant_forms text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Words
create table public.words (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  simplified text not null,
  traditional text,
  hanzi text not null,
  pinyin text not null,
  han_viet text,
  vietnamese_meaning text not null,
  english_meaning text,
  hsk_level integer check (hsk_level between 1 and 9),
  topic_id uuid references public.topics(id) on delete set null,
  radical_id uuid references public.radicals(id) on delete set null,
  notes text,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  -- Enrichment fields
  external_source text,
  external_id text,
  source_row_key text,
  normalized_text text,
  meanings_vi text,
  traditional_variant text,
  part_of_speech text,
  component_breakdown_json jsonb,
  radical_summary text,
  mnemonic text,
  character_structure_type text,
  structure_explanation text,
  ambiguity_flag boolean not null default false,
  ambiguity_note text,
  reading_candidates text,
  review_status public.vocab_review_status not null default 'approved',
  ai_status public.vocab_ai_status not null default 'done',
  source_confidence public.source_confidence_level,
  content_hash text,
  last_synced_at timestamptz,
  last_source_updated_at timestamptz
);

-- Word Examples
create table public.word_examples (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references public.words(id) on delete cascade,
  chinese_text text not null,
  pinyin text,
  vietnamese_meaning text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint word_examples_word_sort_unique unique (word_id, sort_order)
);

-- Word Tag Links
create table public.word_tag_links (
  word_id uuid not null references public.words(id) on delete cascade,
  word_tag_id uuid not null references public.word_tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (word_id, word_tag_id)
);

-- Word Radicals
create table public.word_radicals (
  word_id uuid not null references public.words(id) on delete cascade,
  radical_id uuid not null references public.radicals(id) on delete cascade,
  is_main boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (word_id, radical_id)
);

-- Grammar Points
create table public.grammar_points (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  hsk_level integer not null check (hsk_level between 1 and 9),
  structure_text text not null,
  explanation_vi text not null,
  notes text,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Grammar Examples
create table public.grammar_examples (
  id uuid primary key default gen_random_uuid(),
  grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  chinese_text text not null,
  pinyin text,
  vietnamese_meaning text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint grammar_examples_point_sort_unique unique (grammar_point_id, sort_order)
);

-- Lessons
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  hsk_level integer not null check (hsk_level between 1 and 9),
  topic_id uuid references public.topics(id) on delete set null,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Links: Lesson-Words
create table public.lesson_words (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (lesson_id, word_id),
  constraint lesson_words_lesson_sort_unique unique (lesson_id, sort_order)
);

-- Links: Lesson-Grammar
create table public.lesson_grammar_points (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (lesson_id, grammar_point_id),
  constraint lesson_grammar_points_lesson_sort_unique unique (lesson_id, sort_order)
);

-- 4. USER PROGRESS TABLES

-- Word Progress
create table public.user_word_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  status public.progress_status not null default 'new',
  correct_count integer not null default 0 check (correct_count >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  streak_count integer not null default 0 check (streak_count >= 0),
  next_review_at timestamptz,
  last_reviewed_at timestamptz,
  ease_factor numeric(4,2) not null default 2.50,
  interval_days integer not null default 1 check (interval_days >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_word_progress_user_word_unique unique (user_id, word_id)
);

-- Lesson Progress
create table public.user_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completion_percent numeric(5,2) not null default 0 check (completion_percent >= 0 and completion_percent <= 100),
  last_studied_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_lesson_progress_user_lesson_unique unique (user_id, lesson_id)
);

-- Review Events
create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  mode public.review_mode not null,
  result public.review_result not null,
  reviewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

-- 5. VOCAB SYNC PIPELINE TABLES

-- Batches
create table public.vocab_sync_batches (
  id uuid primary key default gen_random_uuid(),
  external_source text not null default 'google_sheets',
  source_document_id text,
  source_sheet_name text,
  source_sheet_gid text,
  status public.vocab_sync_batch_status not null default 'pending',
  initiated_by uuid references public.profiles(id) on delete set null,
  raw_batch_payload jsonb,
  total_rows integer not null default 0 check (total_rows >= 0),
  pending_rows integer not null default 0 check (pending_rows >= 0),
  approved_rows integer not null default 0 check (approved_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  applied_rows integer not null default 0 check (applied_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Rows
create table public.vocab_sync_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.vocab_sync_batches(id) on delete cascade,
  external_source text not null default 'google_sheets',
  external_id text,
  source_row_key text not null,
  source_updated_at timestamptz,
  raw_payload jsonb not null,
  normalized_payload jsonb not null default '{}'::jsonb,
  admin_edited_payload jsonb,
  content_hash text,
  change_classification public.vocab_sync_change_kind not null default 'new',
  review_status public.vocab_review_status not null default 'pending',
  ai_status public.vocab_ai_status not null default 'pending',
  source_confidence public.source_confidence_level,
  diff_summary jsonb,
  review_note text,
  apply_status public.vocab_sync_apply_status not null default 'pending',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  applied_word_id uuid references public.words(id) on delete set null,
  applied_by uuid references public.profiles(id) on delete set null,
  applied_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  -- Preview/Identity fields from 0004/0005
  source_row_number integer,
  parse_errors jsonb not null default '[]'::jsonb,
  matched_word_ids uuid[] not null default '{}'::uuid[],
  match_result text
);

-- Apply Events
create table public.vocab_sync_apply_events (
  id uuid primary key default gen_random_uuid(),
  sync_row_id uuid not null references public.vocab_sync_rows(id) on delete cascade,
  batch_id uuid not null references public.vocab_sync_batches(id) on delete cascade,
  word_id uuid references public.words(id) on delete cascade,
  operation text,
  status public.vocab_sync_apply_status not null default 'pending',
  payload_snapshot jsonb,
  result_snapshot jsonb,
  error_message text,
  applied_by uuid references public.profiles(id) on delete set null,
  applied_at timestamptz not null default timezone('utc', now())
);

-- 6. FUNCTIONS

-- Automated Updated At
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end; $$;

-- Admin check
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'::public.app_role
  );
$$;

-- New user registration handler
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url',
    'user'::public.app_role
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end; $$;

-- Prevent self-promotion
create or replace function public.prevent_profile_role_self_change()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() <> 'service_role' and new.role <> 'user'::public.app_role then
      raise exception 'role changes are server-managed only';
    end if;
    return new;
  end if;
  if auth.role() <> 'service_role' and new.role is distinct from old.role then
    raise exception 'role changes are server-managed only';
  end if;
  return new;
end; $$;

-- Authoritative Word-Radical Sync (from 0008)
create or replace function public.sync_word_main_radical_from_links()
returns trigger language plpgsql as $$
declare
  v_word_id uuid;
  v_main_radical_id uuid;
begin
  v_word_id := coalesce(new.word_id, old.word_id);
  select radical_id into v_main_radical_id from public.word_radicals
  where word_id = v_word_id and is_main = true
  order by sort_order limit 1;

  if v_main_radical_id is null then
    select radical_id into v_main_radical_id from public.word_radicals
    where word_id = v_word_id order by sort_order limit 1;
  end if;

  update public.words as w set radical_id = v_main_radical_id
  where w.id = v_word_id and w.radical_id is distinct from v_main_radical_id;
  return coalesce(new, old);
end; $$;

-- Consolidated Apply Sync Row Logic (includes all fixes from 0006-0012)
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
language plpgsql security definer set search_path = public as $$
declare
  v_row public.vocab_sync_rows%rowtype;
  v_payload jsonb;
  v_now timestamptz := timezone('utc', now());
  v_word_id uuid := p_target_word_id;
  v_operation text := 'update';
  v_error_message text;
  v_audit_id uuid;
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
    return query select p_sync_row_id, null::uuid, 'failed'::text, 'failed'::public.vocab_sync_apply_status, 'Only admins may apply sync rows.'::text, null::uuid;
    return;
  end if;

  select * into v_row from public.vocab_sync_rows where id = p_sync_row_id for update;
  if not found then
    return query select p_sync_row_id, null::uuid, 'failed'::text, 'failed'::public.vocab_sync_apply_status, 'Sync row not found.'::text, null::uuid;
    return;
  end if;

  if v_row.review_status not in ('approved', 'applied') then
    update public.vocab_sync_rows as vsr set apply_status = 'failed', error_message = 'Only approved rows can be applied.' where vsr.id = v_row.id;
    insert into public.vocab_sync_apply_events (sync_row_id, batch_id, word_id, operation, status, payload_snapshot, error_message, applied_by, applied_at)
    values (v_row.id, v_row.batch_id, v_row.applied_word_id, 'failed', 'failed', coalesce(v_row.admin_edited_payload, v_row.normalized_payload, '{}'::jsonb), 'Only approved rows can be applied.', coalesce(p_applied_by, v_row.approved_by), v_now)
    returning id into v_audit_id;
    return query select v_row.id, v_row.applied_word_id, 'failed'::text, 'failed'::public.vocab_sync_apply_status, 'Only approved rows can be applied.'::text, v_audit_id;
    return;
  end if;

  if v_row.apply_status = 'applied' and v_row.applied_word_id is not null then
    return query select v_row.id, v_row.applied_word_id, 'skipped'::text, 'applied'::public.vocab_sync_apply_status, null::text, null::uuid;
    return;
  end if;

  v_payload := coalesce(v_row.admin_edited_payload, v_row.normalized_payload, '{}'::jsonb);

  begin
    v_input_text := nullif(trim(v_payload ->> 'inputText'), '');
    v_normalized_text := coalesce(nullif(trim(v_payload ->> 'normalizedText'), ''), v_input_text);
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

    if nullif(trim(v_payload ->> 'hskLevel'), '') is not null then v_hsk_level := (v_payload ->> 'hskLevel')::integer; end if;
    if nullif(trim(v_payload ->> 'reviewStatus'), '') is not null then v_review_status := (v_payload ->> 'reviewStatus')::public.vocab_review_status; end if;
    if nullif(trim(v_payload ->> 'aiStatus'), '') is not null then v_ai_status := (v_payload ->> 'aiStatus')::public.vocab_ai_status; end if;
    if nullif(trim(v_payload ->> 'sourceConfidence'), '') is not null then v_source_confidence := (v_payload ->> 'sourceConfidence')::public.source_confidence_level; end if;
    v_source_updated_at := coalesce((v_payload ->> 'sourceUpdatedAt')::timestamptz, v_row.source_updated_at);

    if v_normalized_text is null or v_pinyin is null or v_meanings_vi is null or p_content_hash is null then raise exception 'Required fields missing.'; end if;

    if v_word_id is null then
      select w.id into v_word_id from public.words as w
      where (w.external_source = v_row.external_source and w.external_id = v_row.external_id)
         or (w.external_source = v_row.external_source and w.source_row_key = v_row.source_row_key)
      limit 1;
    end if;

    with desired_radicals as (
      select trim(value) as requested, min(ord::integer) as sort_order from jsonb_array_elements_text(coalesce(v_payload -> 'mainRadicals', '[]'::jsonb)) with ordinality as elements(value, ord)
      where nullif(trim(value), '') is not null group by trim(value)
    ),
    matched_radicals as (
      select dr.requested, dr.sort_order, min(rd.id::text)::uuid as radical_id from desired_radicals dr
      left join lateral (
        select lower(trim(val)) as alias from (values (dr.requested), (nullif(trim((regexp_match(dr.requested, '^(.*?)\s*\(([^)]+)\)\s*$'))[1]), '')), (nullif(trim((regexp_match(dr.requested, '^(.*?)\s*\(([^)]+)\)\s*$'))[2]), ''))) as t(val) where val is not null and val <> ''
      ) al on true
      left join public.radicals as rd on lower(trim(rd.radical)) = al.alias or lower(trim(rd.display_label)) = al.alias or lower(trim(rd.han_viet_name)) = al.alias or lower(trim(rd.meaning_vi)) = al.alias or exists (select 1 from unnest(rd.variant_forms) as v where lower(trim(v)) = al.alias)
      group by dr.requested, dr.sort_order
    )
    select string_agg(requested, ', ' order by sort_order) into v_missing_radicals from matched_radicals where radical_id is null;

    if v_missing_radicals is not null then raise exception 'Missing radical mappings: %', v_missing_radicals; end if;

    if v_word_id is null then
      if p_new_slug is null then raise exception 'Slug required for new word.'; end if;
      insert into public.words (slug, simplified, traditional, hanzi, pinyin, han_viet, vietnamese_meaning, external_source, external_id, source_row_key, normalized_text, meanings_vi, traditional_variant, hsk_level, part_of_speech, component_breakdown_json, radical_summary, mnemonic, character_structure_type, structure_explanation, notes, ambiguity_flag, ambiguity_note, reading_candidates, review_status, ai_status, source_confidence, content_hash, last_synced_at, last_source_updated_at, is_published, created_by)
      values (trim(p_new_slug), v_input_text, v_traditional_variant, v_input_text, v_pinyin, v_han_viet, v_meanings_vi, v_row.external_source, v_row.external_id, v_row.source_row_key, v_normalized_text, v_meanings_vi, v_traditional_variant, v_hsk_level, v_part_of_speech, v_component_breakdown_json, v_radical_summary, v_mnemonic, v_character_structure_type, v_structure_explanation, v_notes, v_ambiguity_flag, v_ambiguity_note, v_reading_candidates, 'applied', v_ai_status, v_source_confidence, p_content_hash, v_now, v_source_updated_at, false, coalesce(p_applied_by, v_row.approved_by))
      returning id into v_word_id; v_operation := 'insert';
    else
      update public.words as w set simplified = v_input_text, traditional = v_traditional_variant, hanzi = v_input_text, pinyin = v_pinyin, han_viet = v_han_viet, vietnamese_meaning = v_meanings_vi, external_source = v_row.external_source, external_id = v_row.external_id, source_row_key = v_row.source_row_key, normalized_text = v_normalized_text, meanings_vi = v_meanings_vi, traditional_variant = v_traditional_variant, hsk_level = coalesce(v_hsk_level, w.hsk_level), part_of_speech = v_part_of_speech, component_breakdown_json = v_component_breakdown_json, radical_summary = v_radical_summary, mnemonic = v_mnemonic, character_structure_type = v_character_structure_type, structure_explanation = v_structure_explanation, notes = v_notes, ambiguity_flag = v_ambiguity_flag, ambiguity_note = v_ambiguity_note, reading_candidates = v_reading_candidates, review_status = 'applied', ai_status = v_ai_status, source_confidence = v_source_confidence, content_hash = p_content_hash, last_synced_at = v_now, last_source_updated_at = v_source_updated_at
      where w.id = v_word_id;
    end if;

    delete from public.word_examples as we where we.word_id = v_word_id;
    insert into public.word_examples (word_id, chinese_text, pinyin, vietnamese_meaning, sort_order)
    select v_word_id, trim(ex.value ->> 'chineseText'), nullif(trim(ex.value ->> 'pinyin'), ''), trim(ex.value ->> 'vietnameseMeaning'), coalesce(nullif(trim(ex.value ->> 'sortOrder'), '')::integer, ex.ord::integer)
    from jsonb_array_elements(coalesce(v_payload -> 'examples', '[]'::jsonb)) with ordinality as ex(value, ord) where nullif(trim(ex.value ->> 'chineseText'), '') is not null;

    with dt as (select trim(value) as slg from jsonb_array_elements_text(coalesce(v_payload -> 'topicTags', '[]'::jsonb)) group by trim(value))
    insert into public.word_tags (slug, label) select slg, initcap(replace(replace(slg, '_', ' '), '-', ' ')) from dt on conflict (slug) do nothing;
    delete from public.word_tag_links as wtl where wtl.word_id = v_word_id;
    insert into public.word_tag_links (word_id, word_tag_id) select v_word_id, wt.id from public.word_tags as wt join (select distinct trim(value) as slg from jsonb_array_elements_text(coalesce(v_payload -> 'topicTags', '[]'::jsonb))) as dt on dt.slg = wt.slug;

    delete from public.word_radicals as wr where wr.word_id = v_word_id;
    with dr as (select trim(val) as req, min(ord::integer) as srt from jsonb_array_elements_text(coalesce(v_payload -> 'mainRadicals', '[]'::jsonb)) with ordinality as elements(val, ord) group by trim(val)),
    mr as (select dr.req, dr.srt, min(rd.id::text)::uuid as rid from dr left join lateral (select lower(trim(v)) as al from (values (dr.req), (nullif(trim((regexp_match(dr.req, '^(.*?)\s*\(([^)]+)\)\s*$'))[1]), '')), (nullif(trim((regexp_match(dr.req, '^(.*?)\s*\(([^)]+)\)\s*$'))[2]), ''))) as t(v) where v is not null) al on true left join public.radicals as rd on lower(trim(rd.radical)) = al.al or lower(trim(rd.display_label)) = al.al or lower(trim(rd.han_viet_name)) = al.al or lower(trim(rd.meaning_vi)) = al.al or exists (select 1 from unnest(rd.variant_forms) as v where lower(trim(v)) = al.al) group by dr.req, dr.srt)
    insert into public.word_radicals (word_id, radical_id, is_main, sort_order) select v_word_id, mr.rid, mr.srt = 1, mr.srt - 1 from mr where mr.rid is not null;
    update public.words as w set radical_id = (select radical_id from public.word_radicals as wr where wr.word_id = v_word_id and is_main = true limit 1) where w.id = v_word_id;

    update public.vocab_sync_rows as vsr set review_status = 'applied', apply_status = 'applied', applied_word_id = v_word_id, applied_by = coalesce(p_applied_by, v_row.approved_by), applied_at = v_now where vsr.id = v_row.id;
    insert into public.vocab_sync_apply_events (sync_row_id, batch_id, word_id, operation, status, payload_snapshot, result_snapshot, applied_by, applied_at)
    values (v_row.id, v_row.batch_id, v_word_id, v_operation, 'applied', v_payload, jsonb_build_object('wordId', v_word_id, 'slug', coalesce(p_new_slug, (select slug from public.words where id = v_word_id)), 'sourceRowKey', v_row.source_row_key, 'externalId', v_row.external_id, 'contentHash', p_content_hash, 'appliedAt', v_now), coalesce(p_applied_by, v_row.approved_by), v_now)
    returning id into v_audit_id;

    return query select v_row.id, v_word_id, v_operation, 'applied'::public.vocab_sync_apply_status, null::text, v_audit_id;
  exception when others then
    v_error_message := sqlerrm;
    update public.vocab_sync_rows as vsr set apply_status = 'failed', error_message = v_error_message where vsr.id = v_row.id;
    insert into public.vocab_sync_apply_events (sync_row_id, batch_id, word_id, operation, status, payload_snapshot, error_message, applied_by, applied_at)
    values (v_row.id, v_row.batch_id, case when v_operation = 'insert' then null else v_word_id end, 'failed', 'failed', v_payload, v_error_message, coalesce(p_applied_by, v_row.approved_by), v_now)
    returning id into v_audit_id;
    return query select v_row.id, v_word_id, 'failed'::text, 'failed'::public.vocab_sync_apply_status, v_error_message, v_audit_id;
  end;
end; $$;

-- 7. TRIGGERS

-- Updated_At triggers
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger topics_set_updated_at before update on public.topics for each row execute function public.set_updated_at();
create trigger radicals_set_updated_at before update on public.radicals for each row execute function public.set_updated_at();
create trigger words_set_updated_at before update on public.words for each row execute function public.set_updated_at();
create trigger word_examples_set_updated_at before update on public.word_examples for each row execute function public.set_updated_at();
create trigger word_tags_set_updated_at before update on public.word_tags for each row execute function public.set_updated_at();
create trigger word_tag_links_set_updated_at before update on public.word_tag_links for each row execute function public.set_updated_at();
create trigger word_radicals_set_updated_at before update on public.word_radicals for each row execute function public.set_updated_at();
create trigger grammar_points_set_updated_at before update on public.grammar_points for each row execute function public.set_updated_at();
create trigger grammar_examples_set_updated_at before update on public.grammar_examples for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons for each row execute function public.set_updated_at();
create trigger user_word_progress_set_updated_at before update on public.user_word_progress for each row execute function public.set_updated_at();
create trigger user_lesson_progress_set_updated_at before update on public.user_lesson_progress for each row execute function public.set_updated_at();
create trigger vocab_sync_batches_set_updated_at before update on public.vocab_sync_batches for each row execute function public.set_updated_at();
create trigger vocab_sync_rows_set_updated_at before update on public.vocab_sync_rows for each row execute function public.set_updated_at();

-- Auth trigger
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Profile security trigger
create trigger profiles_prevent_role_self_change before insert or update on public.profiles for each row execute function public.prevent_profile_role_self_change();

-- Authoritative Radical Sync
create trigger sync_word_main_radical_from_links_trigger after insert or update or delete on public.word_radicals for each row execute function public.sync_word_main_radical_from_links();

-- 8. INDICES

create index profiles_role_idx on public.profiles(role);
create index topics_slug_idx on public.topics(slug);
create index radicals_radical_idx on public.radicals(radical);
create index words_slug_idx on public.words(slug);
create index words_hsk_level_idx on public.words(hsk_level);
create index words_topic_id_idx on public.words(topic_id);
create index words_radical_id_idx on public.words(radical_id);
create index words_is_published_idx on public.words(is_published);
create index words_external_source_idx on public.words(external_source);
create index words_external_id_idx on public.words(external_id);
create index words_source_row_key_idx on public.words(source_row_key);
create index words_review_status_idx on public.words(review_status);
create index words_content_hash_idx on public.words(content_hash);
create index words_last_synced_at_idx on public.words(last_synced_at desc);
create unique index words_external_source_external_id_unique_idx on public.words(external_source, external_id) where external_source is not null and external_id is not null;
create unique index words_external_source_source_row_key_unique_idx on public.words(external_source, source_row_key) where external_source is not null and source_row_key is not null;
create index word_examples_word_id_idx on public.word_examples(word_id);
create index word_tags_slug_idx on public.word_tags(slug);
create index word_tag_links_tag_idx on public.word_tag_links(word_tag_id);
create index word_radicals_radical_idx on public.word_radicals(radical_id);
create index word_radicals_word_sort_idx on public.word_radicals(word_id, sort_order);
create unique index word_radicals_word_main_unique_idx on public.word_radicals(word_id) where is_main = true;
create index grammar_points_slug_idx on public.grammar_points(slug);
create index grammar_points_is_published_idx on public.grammar_points(is_published);
create index lessons_slug_idx on public.lessons(slug);
create index lessons_is_published_idx on public.lessons(is_published);
create index user_word_progress_user_id_idx on public.user_word_progress(user_id);
create index user_word_progress_next_review_at_idx on public.user_word_progress(next_review_at);
create index review_events_user_id_reviewed_at_idx on public.review_events(user_id, reviewed_at desc);
create index vocab_sync_batches_status_idx on public.vocab_sync_batches(status);
create index vocab_sync_rows_batch_idx on public.vocab_sync_rows(batch_id);
create index vocab_sync_rows_review_status_idx on public.vocab_sync_rows(review_status);
create index vocab_sync_rows_apply_status_idx on public.vocab_sync_rows(apply_status);
create index vocab_sync_rows_match_result_idx on public.vocab_sync_rows(match_result);
create unique index vocab_sync_rows_batch_source_row_number_unique_idx on public.vocab_sync_rows(batch_id, source_row_number) where source_row_number is not null;

-- 9. RLS & POLICIES

alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.radicals enable row level security;
alter table public.words enable row level security;
alter table public.word_examples enable row level security;
alter table public.word_tags enable row level security;
alter table public.word_tag_links enable row level security;
alter table public.word_radicals enable row level security;
alter table public.grammar_points enable row level security;
alter table public.grammar_examples enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_words enable row level security;
alter table public.lesson_grammar_points enable row level security;
alter table public.user_word_progress enable row level security;
alter table public.user_lesson_progress enable row level security;
alter table public.review_events enable row level security;
alter table public.vocab_sync_batches enable row level security;
alter table public.vocab_sync_rows enable row level security;
alter table public.vocab_sync_apply_events enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id and role = 'user'::public.app_role);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Public Read / Admin Write
create policy "topics_read" on public.topics for select to public using (true);
create policy "topics_admin" on public.topics for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "radicals_read" on public.radicals for select to public using (true);
create policy "radicals_admin" on public.radicals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "words_read" on public.words for select to public using (is_published or public.is_admin());
create policy "words_admin" on public.words for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "word_examples_read" on public.word_examples for select to public using (exists (select 1 from public.words w where w.id = word_examples.word_id and (w.is_published or public.is_admin())));
create policy "word_examples_admin" on public.word_examples for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "word_tags_read" on public.word_tags for select to public using (true);
create policy "word_tags_admin" on public.word_tags for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "lesson_words_read" on public.lesson_words for select to public using (exists (select 1 from public.lessons l where l.id = lesson_id and (l.is_published or public.is_admin())));
create policy "lesson_words_admin" on public.lesson_words for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Progress/Events
create policy "user_word_progress_own" on public.user_word_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_lesson_progress_own" on public.user_lesson_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "review_events_own" on public.review_events for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sync Pipeline
create policy "vocab_sync_admin" on public.vocab_sync_batches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "vocab_sync_rows_admin" on public.vocab_sync_rows for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "vocab_sync_apply_events_admin" on public.vocab_sync_apply_events for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Permissions
grant execute on function public.apply_vocab_sync_row(uuid, uuid, text, text, uuid) to authenticated;
