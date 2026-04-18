-- ==========================================
-- VOCAB SYNC FOUNDATION
-- ==========================================

-- ==========================================
-- CUSTOM TYPES
-- ==========================================

do $$
begin
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

-- ==========================================
-- RADICAL ENRICHMENT
-- ==========================================

alter table public.radicals
  add column if not exists display_label text,
  add column if not exists han_viet_name text,
  add column if not exists variant_forms text[] not null default '{}'::text[];

create unique index if not exists radicals_radical_unique_idx on public.radicals(radical);

update public.radicals
set
  display_label = coalesce(display_label, radical),
  han_viet_name = coalesce(han_viet_name, meaning_vi),
  variant_forms = coalesce(variant_forms, '{}'::text[])
where display_label is null
   or han_viet_name is null
   or variant_forms is null;

-- ==========================================
-- WORD ENRICHMENT
-- ==========================================

alter table public.words
  add column if not exists external_source text,
  add column if not exists external_id text,
  add column if not exists source_row_key text,
  add column if not exists normalized_text text,
  add column if not exists meanings_vi text,
  add column if not exists traditional_variant text,
  add column if not exists part_of_speech text,
  add column if not exists component_breakdown_json jsonb,
  add column if not exists radical_summary text,
  add column if not exists mnemonic text,
  add column if not exists character_structure_type text,
  add column if not exists structure_explanation text,
  add column if not exists ambiguity_flag boolean not null default false,
  add column if not exists ambiguity_note text,
  add column if not exists reading_candidates text,
  add column if not exists review_status public.vocab_review_status not null default 'approved',
  add column if not exists ai_status public.vocab_ai_status not null default 'done',
  add column if not exists source_confidence public.source_confidence_level,
  add column if not exists content_hash text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_source_updated_at timestamptz;

update public.words
set
  normalized_text = coalesce(normalized_text, simplified, hanzi),
  meanings_vi = coalesce(meanings_vi, vietnamese_meaning),
  traditional_variant = coalesce(traditional_variant, traditional),
  source_confidence = coalesce(source_confidence, 'high'::public.source_confidence_level),
  content_hash = coalesce(
    content_hash,
    md5(
      concat_ws(
        '|',
        coalesce(normalized_text, simplified, hanzi, ''),
        coalesce(pinyin, ''),
        coalesce(meanings_vi, vietnamese_meaning, ''),
        coalesce(han_viet, ''),
        coalesce(traditional_variant, traditional, ''),
        coalesce(hsk_level::text, ''),
        coalesce(notes, '')
      )
    )
  )
where normalized_text is null
   or meanings_vi is null
   or traditional_variant is null
   or source_confidence is null
   or content_hash is null;

create index if not exists words_external_source_idx on public.words(external_source);
create index if not exists words_external_id_idx on public.words(external_id);
create index if not exists words_source_row_key_idx on public.words(source_row_key);
create index if not exists words_normalized_text_idx on public.words(normalized_text);
create index if not exists words_review_status_idx on public.words(review_status);
create index if not exists words_content_hash_idx on public.words(content_hash);
create index if not exists words_last_synced_at_idx on public.words(last_synced_at desc);
create unique index if not exists words_external_source_external_id_unique_idx
  on public.words(external_source, external_id)
  where external_source is not null and external_id is not null;
create unique index if not exists words_external_source_source_row_key_unique_idx
  on public.words(external_source, source_row_key)
  where external_source is not null and source_row_key is not null;

-- ==========================================
-- TAGS AND RADICAL LINKS
-- ==========================================

create table if not exists public.word_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.word_tag_links (
  word_id uuid not null references public.words(id) on delete cascade,
  word_tag_id uuid not null references public.word_tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (word_id, word_tag_id)
);

create table if not exists public.word_radicals (
  word_id uuid not null references public.words(id) on delete cascade,
  radical_id uuid not null references public.radicals(id) on delete cascade,
  is_main boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (word_id, radical_id)
);

create index if not exists word_tags_slug_idx on public.word_tags(slug);
create index if not exists word_tag_links_tag_idx on public.word_tag_links(word_tag_id);
create index if not exists word_radicals_radical_idx on public.word_radicals(radical_id);
create index if not exists word_radicals_word_sort_idx on public.word_radicals(word_id, sort_order);
create unique index if not exists word_radicals_word_main_unique_idx
  on public.word_radicals(word_id)
  where is_main = true;

create or replace function public.sync_primary_word_radical()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.radical_id is distinct from new.radical_id and old.radical_id is not null then
    delete from public.word_radicals
    where word_id = new.id
      and radical_id = old.radical_id
      and is_main = true
      and sort_order = 0;
  end if;

  if new.radical_id is not null then
    insert into public.word_radicals (word_id, radical_id, is_main, sort_order)
    values (new.id, new.radical_id, true, 0)
    on conflict (word_id, radical_id) do update
    set
      is_main = excluded.is_main,
      sort_order = excluded.sort_order,
      updated_at = timezone('utc', now());
  end if;

  return new;
end;
$$;

insert into public.word_radicals (word_id, radical_id, is_main, sort_order)
select
  id as word_id,
  radical_id,
  true as is_main,
  0 as sort_order
from public.words
where radical_id is not null
on conflict (word_id, radical_id) do update
set
  is_main = excluded.is_main,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

-- ==========================================
-- STAGING / REVIEW TABLES
-- ==========================================

create table if not exists public.vocab_sync_batches (
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

create table if not exists public.vocab_sync_rows (
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
  constraint vocab_sync_rows_batch_source_row_key_unique unique (batch_id, source_row_key)
);

create index if not exists vocab_sync_batches_status_idx on public.vocab_sync_batches(status);
create index if not exists vocab_sync_batches_source_idx on public.vocab_sync_batches(external_source, source_document_id);
create index if not exists vocab_sync_rows_batch_idx on public.vocab_sync_rows(batch_id);
create index if not exists vocab_sync_rows_review_status_idx on public.vocab_sync_rows(review_status);
create index if not exists vocab_sync_rows_change_classification_idx on public.vocab_sync_rows(change_classification);
create index if not exists vocab_sync_rows_apply_status_idx on public.vocab_sync_rows(apply_status);
create index if not exists vocab_sync_rows_content_hash_idx on public.vocab_sync_rows(content_hash);
create index if not exists vocab_sync_rows_source_lookup_idx on public.vocab_sync_rows(external_source, source_row_key);

-- ==========================================
-- UPDATED_AT TRIGGERS
-- ==========================================

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'word_tags_set_updated_at') then
    create trigger word_tags_set_updated_at
    before update on public.word_tags
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'word_tag_links_set_updated_at') then
    create trigger word_tag_links_set_updated_at
    before update on public.word_tag_links
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'word_radicals_set_updated_at') then
    create trigger word_radicals_set_updated_at
    before update on public.word_radicals
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'words_sync_primary_word_radical') then
    create trigger words_sync_primary_word_radical
    after insert or update of radical_id on public.words
    for each row execute function public.sync_primary_word_radical();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'vocab_sync_batches_set_updated_at') then
    create trigger vocab_sync_batches_set_updated_at
    before update on public.vocab_sync_batches
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'vocab_sync_rows_set_updated_at') then
    create trigger vocab_sync_rows_set_updated_at
    before update on public.vocab_sync_rows
    for each row execute function public.set_updated_at();
  end if;
end
$$;

-- ==========================================
-- RLS
-- ==========================================

alter table public.word_tags enable row level security;
alter table public.word_tag_links enable row level security;
alter table public.word_radicals enable row level security;
alter table public.vocab_sync_batches enable row level security;
alter table public.vocab_sync_rows enable row level security;

drop policy if exists "word_tags_public_read" on public.word_tags;
create policy "word_tags_public_read" on public.word_tags for select to public using (true);

drop policy if exists "word_tags_admin_write" on public.word_tags;
create policy "word_tags_admin_write" on public.word_tags for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "word_tag_links_public_read" on public.word_tag_links;
create policy "word_tag_links_public_read" on public.word_tag_links for select to public using (
  exists (
    select 1
    from public.words
    where words.id = word_tag_links.word_id
      and (words.is_published or public.is_admin())
  )
);

drop policy if exists "word_tag_links_admin_write" on public.word_tag_links;
create policy "word_tag_links_admin_write" on public.word_tag_links for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "word_radicals_public_read" on public.word_radicals;
create policy "word_radicals_public_read" on public.word_radicals for select to public using (
  exists (
    select 1
    from public.words
    where words.id = word_radicals.word_id
      and (words.is_published or public.is_admin())
  )
);

drop policy if exists "word_radicals_admin_write" on public.word_radicals;
create policy "word_radicals_admin_write" on public.word_radicals for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "vocab_sync_batches_admin_only" on public.vocab_sync_batches;
create policy "vocab_sync_batches_admin_only" on public.vocab_sync_batches for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "vocab_sync_rows_admin_only" on public.vocab_sync_rows;
create policy "vocab_sync_rows_admin_only" on public.vocab_sync_rows for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ==========================================
-- RADICAL SEED SNAPSHOT
-- Keep in sync with src/features/vocabulary-sync/radical-seed.ts
-- ==========================================

with raw_seed(raw_label) as (
  values
    ('Nhất 一'),
    ('Cổn 丨'),
    ('Chủ 丶'),
    ('Phiệt 丿'),
    ('Ất 乙'),
    ('Quyết 亅'),
    ('Nhị 二'),
    ('Đầu 亠'),
    ('Nhân 人 (亻)'),
    ('Nhi 儿'),
    ('Nhập 入'),
    ('Bát 八 (丷)'),
    ('Quynh 冂'),
    ('Mịch 冖'),
    ('Băng 冫'),
    ('Kỷ 几'),
    ('Khảm 凵'),
    ('Đao 刀 (刂)'),
    ('Lực 力'),
    ('Bao 勹'),
    ('Chủy 匕'),
    ('Phương 匚'),
    ('Hệ 匸'),
    ('Thập 十'),
    ('Bốc 卜'),
    ('Tiết 卩 (⺋)'),
    ('Hán 厂'),
    ('Tư 厶'),
    ('Hựu 又'),
    ('Khẩu 口'),
    ('Vi 囗'),
    ('Thổ 土'),
    ('Sĩ 士'),
    ('Tuy 夂'),
    ('Truy 夊'),
    ('Tịch 夕'),
    ('Đại 大'),
    ('Nữ 女'),
    ('Tử 子'),
    ('Miên 宀'),
    ('Thốn 寸'),
    ('Tiểu 小 (⺌)'),
    ('Uông 尢 (尣)'),
    ('Thi 尸'),
    ('Triệt 屮'),
    ('Sơn 山'),
    ('Xuyên 巛 (川)'),
    ('Công 工'),
    ('Kỷ 己'),
    ('Cân 巾'),
    ('Can 干'),
    ('Yêu 幺'),
    ('Nghiễm 广'),
    ('Dẫn 廴'),
    ('Củng 廾'),
    ('Dặc 弋'),
    ('Cung 弓'),
    ('Kệ 彐 (彑)'),
    ('Sam 彡'),
    ('Xích 彳'),
    ('Tâm 心 (忄, ⺗)'),
    ('Qua 戈'),
    ('Hộ 戶 (户)'),
    ('Thủ 手 (扌)'),
    ('Chi 支'),
    ('Phộc 攴 (攵)'),
    ('Văn 文'),
    ('Đẩu 斗'),
    ('Cân 斤'),
    ('Phương 方'),
    ('Vô 无 (旡)'),
    ('Nhật 日'),
    ('Viết 曰'),
    ('Nguyệt 月 (⺝ khi làm bộ thịt)'),
    ('Mộc 木'),
    ('Khiếm 欠'),
    ('Chỉ 止'),
    ('Đãi 歹 (歺)'),
    ('Ân 殳'),
    ('Mẫu 毋 (母 liên quan hình thể)'),
    ('Tỷ 比'),
    ('Mao 毛'),
    ('Thị 氏'),
    ('Khí 气'),
    ('Thủy 水 (氵, 氺)'),
    ('Hỏa 火 (灬)'),
    ('Trảo 爪 (爫)'),
    ('Phụ 父'),
    ('Hào 爻'),
    ('Phiến 爿 (丬)'),
    ('Nha 牙'),
    ('Ngưu 牛 (牜)'),
    ('Khuyển 犬 (犭)'),
    ('Huyền 玄'),
    ('Ngọc 玉 (王, ⺩)'),
    ('Qua 瓜'),
    ('Ngõa 瓦'),
    ('Cam 甘'),
    ('Sinh 生'),
    ('Dụng 用'),
    ('Điền 田'),
    ('Sơ 疋 (⺪)'),
    ('Nạch 疒'),
    ('Bạch 白'),
    ('Bì 皮'),
    ('Mãnh 皿'),
    ('Mục 目'),
    ('Mâu 矛'),
    ('Thỉ 矢'),
    ('Thạch 石'),
    ('Thị 示 (礻)'),
    ('Lộc 禸'),
    ('Hòa 禾'),
    ('Huyệt 穴'),
    ('Lập 立'),
    ('Trúc 竹 (⺮)'),
    ('Mễ 米'),
    ('Mịch 糸 (糹, 纟)'),
    ('Phẫu 缶'),
    ('Võng 网 (罒, 罓)'),
    ('Dương 羊 (⺶)'),
    ('Vũ 羽'),
    ('Lão 老 (耂)'),
    ('Nhi 而'),
    ('Nhĩ 耳'),
    ('Bút 聿 (⺻)'),
    ('Nhục 肉 (⺼)'),
    ('Thần 臣'),
    ('Tự 自'),
    ('Chí 至'),
    ('Cữu 臼'),
    ('Thiệt 舌'),
    ('Thuấn 舛'),
    ('Chu 舟'),
    ('Cấn 艮'),
    ('Sắc 色'),
    ('Thảo 艸 (艹)'),
    ('Hổ 虍'),
    ('Trùng 虫'),
    ('Huyết 血'),
    ('Hành 行'),
    ('Y 衣 (衤)'),
    ('Tây 襾 (覀)'),
    ('Kiến 見 (见)'),
    ('Giác 角'),
    ('Ngôn 言 (訁, 讠)'),
    ('Cốc 谷'),
    ('Đậu 豆'),
    ('Thỉ 豕'),
    ('Trĩ 豸'),
    ('Bối 貝 (贝)'),
    ('Xích 赤'),
    ('Tẩu 走'),
    ('Túc 足 (𧾷)'),
    ('Thân 身'),
    ('Xa 車 (车)'),
    ('Tân 辛'),
    ('Thần 辰'),
    ('Sước 辵 (辶)'),
    ('Ấp 邑 (阝– phải)'),
    ('Dậu 酉'),
    ('Thích 釆'),
    ('Lý 里'),
    ('Kim 金 (釒, 钅)'),
    ('Trường 長 (长)'),
    ('Môn 門 (门)'),
    ('Phụ 阜 (阝– trái)'),
    ('Lệ 隶'),
    ('Tuy 隹'),
    ('Vũ 雨'),
    ('Thanh 青'),
    ('Phi 非'),
    ('Diện 面'),
    ('Cách 革'),
    ('Vi 韋 (韦)'),
    ('Âm 音'),
    ('Hiệt 頁 (页)'),
    ('Phong 風 (风)'),
    ('Phi 飛 (飞)'),
    ('Thực 食 (飠, 饣)'),
    ('Thủ 首'),
    ('Hương 香'),
    ('Mã 馬 (马)'),
    ('Cốt 骨'),
    ('Cao 高'),
    ('Phát 髟'),
    ('Đấu 鬥 (斗)'),
    ('Mạch 鬯'),
    ('Cách cách 鬲'),
    ('Quỷ 鬼'),
    ('Ngư 魚 (鱼)'),
    ('Điểu 鳥 (鸟)'),
    ('Lỗ 鹵 (卤)'),
    ('Lộc 鹿'),
    ('Mạch 麥 (麦)'),
    ('Ma 麻'),
    ('Hoàng 黃 (黄)'),
    ('Thử 黍'),
    ('Hắc 黑'),
    ('Đại 黹'),
    ('Thằng 黽 (黾)'),
    ('Đỉnh 鼎'),
    ('Cổ 鼓'),
    ('Thử 鼠'),
    ('Tỵ 鼻'),
    ('Tề 齊 (齐)'),
    ('Xỉ 齒 (齿)'),
    ('Long 龍 (龙)'),
    ('Quy 龜 (龟)'),
    ('Dược 龠')
),
parsed_seed as (
  select
    raw_label,
    trim((regexp_match(raw_label, '^(.*?)\s+([^\s(]+)(?:\s+\(([^)]*)\))?$'))[1]) as han_viet_name,
    trim((regexp_match(raw_label, '^(.*?)\s+([^\s(]+)(?:\s+\(([^)]*)\))?$'))[2]) as radical,
    nullif(trim((regexp_match(raw_label, '^(.*?)\s+([^\s(]+)(?:\s+\(([^)]*)\))?$'))[3]), '') as raw_variants
  from raw_seed
),
radical_seed as (
  select
    parsed_seed.radical,
    parsed_seed.raw_label as display_label,
    parsed_seed.han_viet_name,
    null::text as pinyin,
    parsed_seed.han_viet_name as meaning_vi,
    0 as stroke_count,
    coalesce(
      array_remove(
        array_agg(
          distinct nullif(
            trim(
              regexp_replace(
                regexp_replace(coalesce(token, ''), '[–—-].*$', ''),
                '\s+.*$',
                ''
              )
            ),
            ''
          )
        ) filter (where token is not null),
        parsed_seed.radical
      ),
      array[]::text[]
    ) as variant_forms
  from parsed_seed
  left join lateral unnest(
    case
      when parsed_seed.raw_variants is null then array[]::text[]
      else string_to_array(parsed_seed.raw_variants, ',')
    end
  ) as token on true
  group by parsed_seed.radical, parsed_seed.raw_label, parsed_seed.han_viet_name
)
insert into public.radicals (radical, display_label, han_viet_name, meaning_vi, stroke_count, variant_forms)
select
  radical,
  display_label,
  han_viet_name,
  meaning_vi,
  stroke_count,
  variant_forms
from radical_seed
on conflict (radical) do update
set
  display_label = excluded.display_label,
  han_viet_name = excluded.han_viet_name,
  meaning_vi = excluded.meaning_vi,
  stroke_count = excluded.stroke_count,
  variant_forms = excluded.variant_forms,
  updated_at = timezone('utc', now());
