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

  if not exists (select 1 from pg_type where typname = 'learning_article_type') then
    create type public.learning_article_type as enum ('vocabulary_compare', 'grammar_note', 'usage_note', 'culture', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'article_progress_status') then
    create type public.article_progress_status as enum ('not_started', 'reading', 'completed');
  end if;

  if not exists (select 1 from pg_type where typname = 'lesson_generation_source') then
    create type public.lesson_generation_source as enum ('manual', 'auto');
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
  generation_source public.lesson_generation_source not null default 'manual',
  generation_config jsonb,
  difficulty_level numeric(6,2),
  topic_tag_slugs text[] not null default '{}'::text[],
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  word_count integer not null default 0 check (word_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Links: Lesson-Words
create table public.lesson_words (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  sort_order integer not null default 0,
  difficulty_score numeric(6,2),
  relevance_score numeric(6,2),
  selection_reason text,
  is_new_word boolean not null default true,
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

create table public.lesson_generation_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles(id) on delete set null,
  hsk_level integer not null check (hsk_level between 1 and 9),
  topic_tag_slugs text[] not null default '{}'::text[],
  target_word_count integer not null check (target_word_count between 1 and 50),
  exclude_published_lesson_words boolean not null default true,
  include_unapproved_words boolean not null default false,
  allow_reused_words boolean not null default false,
  generated_title text not null,
  generated_slug text not null,
  generated_summary text not null,
  generated_word_count integer not null default 0 check (generated_word_count >= 0),
  saved_lesson_id uuid references public.lessons(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.lesson_generation_candidates (
  run_id uuid not null references public.lesson_generation_runs(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  sort_order integer not null check (sort_order >= 1),
  selected boolean not null default true,
  difficulty_score numeric(6,2) not null,
  relevance_score numeric(6,2) not null,
  selection_reason text not null,
  lesson_usage_count integer not null default 0 check (lesson_usage_count >= 0),
  published_lesson_usage_count integer not null default 0 check (published_lesson_usage_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (run_id, word_id),
  constraint lesson_generation_candidates_run_sort_unique unique (run_id, sort_order)
);

-- Learning Articles
create table public.learning_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null,
  content_markdown text not null,
  hsk_level integer check (hsk_level between 1 and 9),
  article_type public.learning_article_type not null default 'other',
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.learning_article_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.learning_article_tag_links (
  article_id uuid not null references public.learning_articles(id) on delete cascade,
  tag_id uuid not null references public.learning_article_tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (article_id, tag_id)
);

create table public.learning_article_words (
  article_id uuid not null references public.learning_articles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (article_id, word_id),
  constraint learning_article_words_article_sort_unique unique (article_id, sort_order)
);

create table public.learning_article_grammar_points (
  article_id uuid not null references public.learning_articles(id) on delete cascade,
  grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (article_id, grammar_point_id),
  constraint learning_article_grammar_points_article_sort_unique unique (article_id, sort_order)
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

create table public.user_article_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_id uuid not null references public.learning_articles(id) on delete cascade,
  status public.article_progress_status not null default 'not_started',
  bookmarked boolean not null default false,
  last_read_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_article_progress_user_article_unique unique (user_id, article_id)
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

-- 6. INDICES

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
create index lessons_generation_source_idx on public.lessons(generation_source);
create index lessons_topic_tag_slugs_idx on public.lessons using gin(topic_tag_slugs);
create index learning_articles_slug_idx on public.learning_articles(slug);
create index learning_articles_hsk_level_idx on public.learning_articles(hsk_level);
create index learning_articles_article_type_idx on public.learning_articles(article_type);
create index learning_articles_is_published_idx on public.learning_articles(is_published);
create index learning_articles_published_at_idx on public.learning_articles(published_at desc);
create index learning_article_tags_slug_idx on public.learning_article_tags(slug);
create index learning_article_tag_links_tag_idx on public.learning_article_tag_links(tag_id);
create index learning_article_words_word_idx on public.learning_article_words(word_id);
create index learning_article_grammar_points_point_idx on public.learning_article_grammar_points(grammar_point_id);
create index lesson_generation_runs_requested_by_idx on public.lesson_generation_runs(requested_by);
create index lesson_generation_runs_saved_lesson_idx on public.lesson_generation_runs(saved_lesson_id);
create index lesson_generation_runs_topic_tag_slugs_idx on public.lesson_generation_runs using gin(topic_tag_slugs);
create index lesson_generation_candidates_word_idx on public.lesson_generation_candidates(word_id);
create index lesson_generation_candidates_selected_idx on public.lesson_generation_candidates(run_id, selected);
create index user_word_progress_user_id_idx on public.user_word_progress(user_id);
create index user_word_progress_next_review_at_idx on public.user_word_progress(next_review_at);
create index user_article_progress_user_id_idx on public.user_article_progress(user_id);
create index user_article_progress_article_id_idx on public.user_article_progress(article_id);
create index user_article_progress_status_idx on public.user_article_progress(status);
create index user_article_progress_bookmarked_idx on public.user_article_progress(user_id, bookmarked);
create index review_events_user_id_reviewed_at_idx on public.review_events(user_id, reviewed_at desc);
create index vocab_sync_batches_status_idx on public.vocab_sync_batches(status);
create index vocab_sync_rows_batch_idx on public.vocab_sync_rows(batch_id);
create index vocab_sync_rows_review_status_idx on public.vocab_sync_rows(review_status);
create index vocab_sync_rows_apply_status_idx on public.vocab_sync_rows(apply_status);
create index vocab_sync_rows_match_result_idx on public.vocab_sync_rows(match_result);
create unique index vocab_sync_rows_batch_source_row_number_unique_idx on public.vocab_sync_rows(batch_id, source_row_number) where source_row_number is not null;

-- 7. UTILITY TRIGGER FUNCTION

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end; $$;

-- 8. TRIGGERS

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
create trigger lesson_generation_runs_set_updated_at before update on public.lesson_generation_runs for each row execute function public.set_updated_at();
create trigger learning_articles_set_updated_at before update on public.learning_articles for each row execute function public.set_updated_at();
create trigger learning_article_tags_set_updated_at before update on public.learning_article_tags for each row execute function public.set_updated_at();
create trigger user_word_progress_set_updated_at before update on public.user_word_progress for each row execute function public.set_updated_at();
create trigger user_lesson_progress_set_updated_at before update on public.user_lesson_progress for each row execute function public.set_updated_at();
create trigger user_article_progress_set_updated_at before update on public.user_article_progress for each row execute function public.set_updated_at();
create trigger vocab_sync_batches_set_updated_at before update on public.vocab_sync_batches for each row execute function public.set_updated_at();
create trigger vocab_sync_rows_set_updated_at before update on public.vocab_sync_rows for each row execute function public.set_updated_at();

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
alter table public.lesson_generation_runs enable row level security;
alter table public.lesson_generation_candidates enable row level security;
alter table public.learning_articles enable row level security;
alter table public.learning_article_tags enable row level security;
alter table public.learning_article_tag_links enable row level security;
alter table public.learning_article_words enable row level security;
alter table public.learning_article_grammar_points enable row level security;
alter table public.user_word_progress enable row level security;
alter table public.user_lesson_progress enable row level security;
alter table public.user_article_progress enable row level security;
alter table public.review_events enable row level security;
alter table public.vocab_sync_batches enable row level security;
alter table public.vocab_sync_rows enable row level security;
alter table public.vocab_sync_apply_events enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);

-- Public Read / Admin Write
create policy "topics_read" on public.topics for select to public using (true);
create policy "topics_admin" on public.topics for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "radicals_read" on public.radicals for select to public using (true);
create policy "radicals_admin" on public.radicals for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "words_read" on public.words for select to public using (is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "words_admin" on public.words for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "word_examples_read" on public.word_examples for select to public using (exists (select 1 from public.words w where w.id = word_examples.word_id and (w.is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role))));
create policy "word_examples_admin" on public.word_examples for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "word_tags_read" on public.word_tags for select to public using (true);
create policy "word_tags_admin" on public.word_tags for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "word_tag_links_read" on public.word_tag_links for select to public using (exists (select 1 from public.words w where w.id = word_tag_links.word_id and (w.is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role))));
create policy "word_tag_links_admin" on public.word_tag_links for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "word_radicals_read" on public.word_radicals for select to public using (exists (select 1 from public.words w where w.id = word_radicals.word_id and (w.is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role))));
create policy "word_radicals_admin" on public.word_radicals for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "grammar_points_read" on public.grammar_points for select to public using (is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "grammar_points_admin" on public.grammar_points for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "grammar_examples_read" on public.grammar_examples for select to public using (exists (select 1 from public.grammar_points gp where gp.id = grammar_examples.grammar_point_id and (gp.is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role))));
create policy "grammar_examples_admin" on public.grammar_examples for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "lessons_read" on public.lessons for select to public using (is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "lessons_admin" on public.lessons for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "lesson_words_read" on public.lesson_words for select to public using (exists (select 1 from public.lessons l join public.words w on w.id = lesson_words.word_id where l.id = lesson_words.lesson_id and (l.is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) and (w.is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role))));
create policy "lesson_words_admin" on public.lesson_words for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "lesson_grammar_points_read" on public.lesson_grammar_points for select to public using (exists (select 1 from public.lessons l join public.grammar_points gp on gp.id = lesson_grammar_points.grammar_point_id where l.id = lesson_grammar_points.lesson_id and (l.is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) and (gp.is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role))));
create policy "lesson_grammar_points_admin" on public.lesson_grammar_points for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "lesson_generation_runs_admin" on public.lesson_generation_runs for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "lesson_generation_candidates_admin" on public.lesson_generation_candidates for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "learning_articles_read" on public.learning_articles for select to public using (is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "learning_articles_admin" on public.learning_articles for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "learning_article_tags_read" on public.learning_article_tags for select to public using (true);
create policy "learning_article_tags_admin" on public.learning_article_tags for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "learning_article_tag_links_read" on public.learning_article_tag_links for select to public using (exists (select 1 from public.learning_articles a where a.id = learning_article_tag_links.article_id and (a.is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role))));
create policy "learning_article_tag_links_admin" on public.learning_article_tag_links for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "learning_article_words_read" on public.learning_article_words for select to public using (exists (select 1 from public.learning_articles a where a.id = learning_article_words.article_id and (a.is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role))));
create policy "learning_article_words_admin" on public.learning_article_words for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "learning_article_grammar_points_read" on public.learning_article_grammar_points for select to public using (exists (select 1 from public.learning_articles a where a.id = learning_article_grammar_points.article_id and (a.is_published or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role))));
create policy "learning_article_grammar_points_admin" on public.learning_article_grammar_points for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));

-- Progress/Events
create policy "user_word_progress_own" on public.user_word_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_lesson_progress_own" on public.user_lesson_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_article_progress_own" on public.user_article_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "review_events_own" on public.review_events for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sync Pipeline
create policy "vocab_sync_admin" on public.vocab_sync_batches for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "vocab_sync_rows_admin" on public.vocab_sync_rows for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
create policy "vocab_sync_apply_events_admin" on public.vocab_sync_apply_events for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'::public.app_role));
