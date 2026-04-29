-- ==========================================
-- 0001_INIT_DATABASE.SQL
-- Clean init migration for Chinese Learning App
-- ==========================================

-- Extensions
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Enums / custom types
create type public.app_role as enum ('user', 'admin');
create type public.progress_status as enum ('new', 'learning', 'review', 'mastered');
create type public.review_mode as enum ('flashcard', 'multiple_choice', 'typing');
create type public.review_result as enum ('correct', 'incorrect', 'skipped');
create type public.source_confidence_level as enum ('low', 'medium', 'high');
create type public.vocab_review_status as enum ('pending', 'needs_review', 'approved', 'rejected', 'applied');
create type public.vocab_ai_status as enum ('pending', 'processing', 'done', 'failed', 'skipped');
create type public.vocab_sync_batch_status as enum ('pending', 'running', 'completed', 'failed', 'cancelled');
create type public.vocab_sync_change_kind as enum ('new', 'changed', 'unchanged', 'conflict', 'invalid');
create type public.vocab_sync_apply_status as enum ('pending', 'applied', 'failed', 'skipped');
create type public.learning_article_type as enum ('vocabulary_compare', 'grammar_note', 'usage_note', 'culture', 'other');
create type public.article_progress_status as enum ('not_started', 'reading', 'completed');
create type public.lesson_generation_source as enum ('manual', 'auto');
create type public.practice_progress_status as enum ('new', 'practicing', 'completed', 'difficult');
create type public.reading_practice_type as enum ('word', 'sentence');
create type public.practice_event_type as enum ('reading_word', 'reading_sentence', 'writing_character');
create type public.practice_event_result as enum ('completed', 'difficult', 'skipped');
create type public.scheduler_type as enum ('sm2', 'fsrs');
create type public.scheduler_state as enum ('new', 'learning', 'review', 'relearning');
create type public.scheduler_grade as enum ('again', 'hard', 'good', 'easy');

-- Utility function
-- Allowed by project rules as a trivial timestamp helper.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Tables
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
  constraint profiles_preferred_language_check check (preferred_language in ('en', 'vi', 'zh')),
  constraint profiles_preferred_theme_check check (preferred_theme in ('light', 'dark', 'system')),
  constraint profiles_preferred_font_check check (preferred_font in ('sans', 'serif', 'kai'))
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.word_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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

create table public.word_tag_links (
  word_id uuid not null references public.words(id) on delete cascade,
  word_tag_id uuid not null references public.word_tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (word_id, word_tag_id)
);

create table public.word_radicals (
  word_id uuid not null references public.words(id) on delete cascade,
  radical_id uuid not null references public.radicals(id) on delete cascade,
  is_main boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (word_id, radical_id)
);

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

create table public.user_word_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  scheduler_type public.scheduler_type not null default 'sm2',
  state public.scheduler_state not null default 'new',
  ease_factor numeric(4,2) not null default 2.50,
  interval_days integer not null default 0 check (interval_days >= 0),
  reps integer not null default 0 check (reps >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  learning_step_index integer not null default 0 check (learning_step_index >= 0),
  due_at timestamptz,
  last_reviewed_at timestamptz,
  last_grade public.scheduler_grade,
  fsrs_stability numeric(12,4),
  fsrs_difficulty numeric(12,4),
  fsrs_retrievability numeric(12,6),
  scheduled_days integer not null default 0 check (scheduled_days >= 0),
  elapsed_days integer not null default 0 check (elapsed_days >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_word_memory_user_word_unique unique (user_id, word_id)
);

create table public.user_learning_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  streak_count integer not null default 0 check (streak_count >= 0),
  last_active_date date,
  daily_goal integer not null default 10 check (daily_goal >= 1 and daily_goal <= 500),
  scheduler_type public.scheduler_type not null default 'sm2',
  desired_retention numeric(4,2) not null default 0.90 check (desired_retention >= 0.70 and desired_retention <= 0.99),
  maximum_interval_days integer not null default 36500 check (maximum_interval_days >= 1 and maximum_interval_days <= 36500),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid references public.words(id) on delete cascade,
  example_id uuid references public.word_examples(id) on delete cascade,
  practice_type public.reading_practice_type not null,
  status public.practice_progress_status not null default 'new',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_practiced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_reading_progress_target_check check (
    (practice_type = 'word' and word_id is not null and example_id is null)
    or
    (practice_type = 'sentence' and example_id is not null and word_id is null)
  )
);

create table public.user_writing_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  character text not null,
  status public.practice_progress_status not null default 'new',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_practiced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_writing_progress_character_length_check check (char_length(character) = 1),
  constraint user_writing_progress_user_word_character_unique unique (user_id, word_id, character)
);

create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  mode public.review_mode,
  result public.review_result,
  practice_type text not null,
  grade public.scheduler_grade not null,
  scheduler_type public.scheduler_type not null default 'sm2',
  previous_state public.scheduler_state,
  next_state public.scheduler_state,
  previous_interval_days integer,
  next_interval_days integer,
  previous_due_at timestamptz,
  next_due_at timestamptz,
  previous_stability numeric(12,4),
  next_stability numeric(12,4),
  previous_difficulty numeric(12,4),
  next_difficulty numeric(12,4),
  previous_retrievability numeric(12,6),
  next_retrievability numeric(12,6),
  reviewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.practice_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid references public.words(id) on delete cascade,
  example_id uuid references public.word_examples(id) on delete cascade,
  practice_type public.practice_event_type not null,
  result public.practice_event_result not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint practice_events_target_check check (
    (practice_type = 'reading_word' and word_id is not null and example_id is null)
    or
    (practice_type = 'reading_sentence' and example_id is not null and word_id is null)
    or
    (practice_type = 'writing_character' and word_id is not null and example_id is null)
  )
);

create table public.user_xp (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_level (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  level integer not null default 1 check (level >= 1),
  current_xp integer not null default 0 check (current_xp >= 0),
  next_level_xp integer not null default 100 check (next_level_xp > current_xp),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null,
  earned_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_achievements_unique unique (user_id, achievement_key)
);

create table public.user_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_key text not null,
  reason text not null,
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_xp_events_unique unique (user_id, source_key)
);

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

create table public.vocab_sync_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.vocab_sync_batches(id) on delete cascade,
  external_source text not null default 'google_sheets',
  external_id text,
  source_row_key text not null,
  source_row_number integer,
  source_updated_at timestamptz,
  raw_payload jsonb not null,
  normalized_payload jsonb not null default '{}'::jsonb,
  admin_edited_payload jsonb,
  content_hash text,
  change_classification public.vocab_sync_change_kind not null default 'new',
  match_result text check (match_result in ('external_id', 'source_row_key', 'normalized_text', 'none', 'conflict')),
  matched_word_ids uuid[] not null default '{}'::uuid[],
  parse_errors jsonb not null default '[]'::jsonb,
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
  updated_at timestamptz not null default timezone('utc', now())
);

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

-- Constraints and foreign keys
-- All primary keys, unique constraints, checks, and foreign keys are defined inline
-- above so the schema is correct from the first create.

-- Indexes
create index profiles_role_idx on public.profiles(role);
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
create unique index words_external_source_external_id_unique_idx
  on public.words(external_source, external_id)
  where external_source is not null and external_id is not null;
create unique index words_external_source_source_row_key_unique_idx
  on public.words(external_source, source_row_key)
  where external_source is not null and source_row_key is not null;
create index word_examples_word_id_idx on public.word_examples(word_id);
create index word_tag_links_tag_idx on public.word_tag_links(word_tag_id);
create index word_radicals_radical_idx on public.word_radicals(radical_id);
create index word_radicals_word_sort_idx on public.word_radicals(word_id, sort_order);
create unique index word_radicals_word_main_unique_idx
  on public.word_radicals(word_id)
  where is_main = true;
create index grammar_points_hsk_level_idx on public.grammar_points(hsk_level);
create index grammar_points_is_published_idx on public.grammar_points(is_published);
create index grammar_examples_point_idx on public.grammar_examples(grammar_point_id);
create index lessons_hsk_level_idx on public.lessons(hsk_level);
create index lessons_topic_id_idx on public.lessons(topic_id);
create index lessons_is_published_idx on public.lessons(is_published);
create index lessons_generation_source_idx on public.lessons(generation_source);
create index lessons_topic_tag_slugs_idx on public.lessons using gin(topic_tag_slugs);
create index lesson_words_word_idx on public.lesson_words(word_id);
create index lesson_grammar_points_point_idx on public.lesson_grammar_points(grammar_point_id);
create index lesson_generation_runs_requested_by_idx on public.lesson_generation_runs(requested_by);
create index lesson_generation_runs_saved_lesson_idx on public.lesson_generation_runs(saved_lesson_id);
create index lesson_generation_runs_topic_tag_slugs_idx on public.lesson_generation_runs using gin(topic_tag_slugs);
create index lesson_generation_candidates_word_idx on public.lesson_generation_candidates(word_id);
create index lesson_generation_candidates_selected_idx on public.lesson_generation_candidates(run_id, selected);
create index learning_articles_hsk_level_idx on public.learning_articles(hsk_level);
create index learning_articles_article_type_idx on public.learning_articles(article_type);
create index learning_articles_is_published_idx on public.learning_articles(is_published);
create index learning_articles_published_at_idx on public.learning_articles(published_at desc);
create index learning_article_tag_links_tag_idx on public.learning_article_tag_links(tag_id);
create index learning_article_words_word_idx on public.learning_article_words(word_id);
create index learning_article_grammar_points_point_idx on public.learning_article_grammar_points(grammar_point_id);
create index user_word_progress_user_id_idx on public.user_word_progress(user_id);
create index user_word_progress_next_review_at_idx on public.user_word_progress(next_review_at);
create index user_lesson_progress_user_id_idx on public.user_lesson_progress(user_id);
create index user_article_progress_user_id_idx on public.user_article_progress(user_id);
create index user_article_progress_article_id_idx on public.user_article_progress(article_id);
create index user_article_progress_status_idx on public.user_article_progress(status);
create index user_article_progress_bookmarked_idx on public.user_article_progress(user_id, bookmarked);
create index user_word_memory_user_due_idx on public.user_word_memory(user_id, due_at asc);
create index user_word_memory_user_state_due_idx on public.user_word_memory(user_id, state, due_at asc);
create index user_word_memory_user_scheduler_due_idx on public.user_word_memory(user_id, scheduler_type, due_at asc);
create index user_word_memory_word_id_idx on public.user_word_memory(word_id);
create index user_word_memory_user_reps_idx on public.user_word_memory(user_id, reps desc);
create index user_reading_progress_user_type_status_idx on public.user_reading_progress(user_id, practice_type, status);
create index user_reading_progress_user_last_practiced_idx on public.user_reading_progress(user_id, last_practiced_at desc);
create unique index user_reading_progress_user_word_unique_idx
  on public.user_reading_progress(user_id, word_id)
  where practice_type = 'word';
create unique index user_reading_progress_user_example_unique_idx
  on public.user_reading_progress(user_id, example_id)
  where practice_type = 'sentence';
create index user_writing_progress_user_status_idx on public.user_writing_progress(user_id, status);
create index user_writing_progress_user_last_practiced_idx on public.user_writing_progress(user_id, last_practiced_at desc);
create index user_writing_progress_user_word_idx on public.user_writing_progress(user_id, word_id);
create index review_events_user_id_reviewed_at_idx on public.review_events(user_id, reviewed_at desc);
create index review_events_user_due_history_idx on public.review_events(user_id, reviewed_at desc, grade);
create index review_events_user_scheduler_history_idx on public.review_events(user_id, reviewed_at desc, scheduler_type, grade);
create index practice_events_user_created_idx on public.practice_events(user_id, created_at desc);
create index practice_events_type_created_idx on public.practice_events(practice_type, created_at desc);
create index user_xp_total_xp_idx on public.user_xp(total_xp desc);
create index user_level_level_idx on public.user_level(level desc);
create index user_achievements_user_earned_at_idx on public.user_achievements(user_id, earned_at desc);
create index user_achievements_key_idx on public.user_achievements(achievement_key);
create index user_xp_events_user_created_at_idx on public.user_xp_events(user_id, created_at desc);
create index vocab_sync_batches_status_idx on public.vocab_sync_batches(status);
create index vocab_sync_batches_source_idx on public.vocab_sync_batches(external_source, source_document_id);
create index vocab_sync_rows_batch_idx on public.vocab_sync_rows(batch_id);
create index vocab_sync_rows_batch_source_row_key_idx on public.vocab_sync_rows(batch_id, source_row_key);
create index vocab_sync_rows_source_lookup_idx on public.vocab_sync_rows(external_source, source_row_key);
create index vocab_sync_rows_review_status_idx on public.vocab_sync_rows(review_status);
create index vocab_sync_rows_apply_status_idx on public.vocab_sync_rows(apply_status);
create index vocab_sync_rows_match_result_idx on public.vocab_sync_rows(match_result);
create unique index vocab_sync_rows_batch_source_row_number_unique_idx
  on public.vocab_sync_rows(batch_id, source_row_number)
  where source_row_number is not null;

-- Triggers
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger topics_set_updated_at before update on public.topics for each row execute function public.set_updated_at();
create trigger word_tags_set_updated_at before update on public.word_tags for each row execute function public.set_updated_at();
create trigger radicals_set_updated_at before update on public.radicals for each row execute function public.set_updated_at();
create trigger words_set_updated_at before update on public.words for each row execute function public.set_updated_at();
create trigger word_examples_set_updated_at before update on public.word_examples for each row execute function public.set_updated_at();
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
create trigger user_word_memory_set_updated_at before update on public.user_word_memory for each row execute function public.set_updated_at();
create trigger user_learning_stats_set_updated_at before update on public.user_learning_stats for each row execute function public.set_updated_at();
create trigger user_reading_progress_set_updated_at before update on public.user_reading_progress for each row execute function public.set_updated_at();
create trigger user_writing_progress_set_updated_at before update on public.user_writing_progress for each row execute function public.set_updated_at();
create trigger user_xp_set_updated_at before update on public.user_xp for each row execute function public.set_updated_at();
create trigger user_level_set_updated_at before update on public.user_level for each row execute function public.set_updated_at();
create trigger user_achievements_set_updated_at before update on public.user_achievements for each row execute function public.set_updated_at();
create trigger vocab_sync_batches_set_updated_at before update on public.vocab_sync_batches for each row execute function public.set_updated_at();
create trigger vocab_sync_rows_set_updated_at before update on public.vocab_sync_rows for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.word_tags enable row level security;
alter table public.radicals enable row level security;
alter table public.words enable row level security;
alter table public.word_examples enable row level security;
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
alter table public.user_word_memory enable row level security;
alter table public.user_learning_stats enable row level security;
alter table public.user_reading_progress enable row level security;
alter table public.user_writing_progress enable row level security;
alter table public.review_events enable row level security;
alter table public.practice_events enable row level security;
alter table public.user_xp enable row level security;
alter table public.user_level enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_xp_events enable row level security;
alter table public.vocab_sync_batches enable row level security;
alter table public.vocab_sync_rows enable row level security;
alter table public.vocab_sync_apply_events enable row level security;

-- Policies
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "topics_read"
  on public.topics
  for select
  to public
  using (true);

create policy "topics_admin"
  on public.topics
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "word_tags_read"
  on public.word_tags
  for select
  to public
  using (true);

create policy "word_tags_admin"
  on public.word_tags
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "radicals_read"
  on public.radicals
  for select
  to public
  using (true);

create policy "radicals_admin"
  on public.radicals
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "words_read"
  on public.words
  for select
  to public
  using (
    is_published
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "words_admin"
  on public.words
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "word_examples_read"
  on public.word_examples
  for select
  to public
  using (
    exists (
      select 1
      from public.words w
      where w.id = word_examples.word_id
        and (
          w.is_published
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

create policy "word_examples_admin"
  on public.word_examples
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "word_tag_links_read"
  on public.word_tag_links
  for select
  to public
  using (
    exists (
      select 1
      from public.words w
      where w.id = word_tag_links.word_id
        and (
          w.is_published
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

create policy "word_tag_links_admin"
  on public.word_tag_links
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "word_radicals_read"
  on public.word_radicals
  for select
  to public
  using (
    exists (
      select 1
      from public.words w
      where w.id = word_radicals.word_id
        and (
          w.is_published
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

create policy "word_radicals_admin"
  on public.word_radicals
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "grammar_points_read"
  on public.grammar_points
  for select
  to public
  using (
    is_published
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "grammar_points_admin"
  on public.grammar_points
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "grammar_examples_read"
  on public.grammar_examples
  for select
  to public
  using (
    exists (
      select 1
      from public.grammar_points gp
      where gp.id = grammar_examples.grammar_point_id
        and (
          gp.is_published
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

create policy "grammar_examples_admin"
  on public.grammar_examples
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "lessons_read"
  on public.lessons
  for select
  to public
  using (
    is_published
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "lessons_admin"
  on public.lessons
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "lesson_words_read"
  on public.lesson_words
  for select
  to public
  using (
    exists (
      select 1
      from public.lessons l
      join public.words w on w.id = lesson_words.word_id
      where l.id = lesson_words.lesson_id
        and (
          l.is_published
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
        and (
          w.is_published
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

create policy "lesson_words_admin"
  on public.lesson_words
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "lesson_grammar_points_read"
  on public.lesson_grammar_points
  for select
  to public
  using (
    exists (
      select 1
      from public.lessons l
      join public.grammar_points gp on gp.id = lesson_grammar_points.grammar_point_id
      where l.id = lesson_grammar_points.lesson_id
        and (
          l.is_published
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
        and (
          gp.is_published
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

create policy "lesson_grammar_points_admin"
  on public.lesson_grammar_points
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "lesson_generation_runs_admin"
  on public.lesson_generation_runs
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "lesson_generation_candidates_admin"
  on public.lesson_generation_candidates
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "learning_articles_read"
  on public.learning_articles
  for select
  to public
  using (
    is_published
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "learning_articles_admin"
  on public.learning_articles
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "learning_article_tags_read"
  on public.learning_article_tags
  for select
  to public
  using (true);

create policy "learning_article_tags_admin"
  on public.learning_article_tags
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "learning_article_tag_links_read"
  on public.learning_article_tag_links
  for select
  to public
  using (
    exists (
      select 1
      from public.learning_articles a
      where a.id = learning_article_tag_links.article_id
        and (
          a.is_published
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

create policy "learning_article_tag_links_admin"
  on public.learning_article_tag_links
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "learning_article_words_read"
  on public.learning_article_words
  for select
  to public
  using (
    exists (
      select 1
      from public.learning_articles a
      where a.id = learning_article_words.article_id
        and (
          a.is_published
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

create policy "learning_article_words_admin"
  on public.learning_article_words
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "learning_article_grammar_points_read"
  on public.learning_article_grammar_points
  for select
  to public
  using (
    exists (
      select 1
      from public.learning_articles a
      where a.id = learning_article_grammar_points.article_id
        and (
          a.is_published
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

create policy "learning_article_grammar_points_admin"
  on public.learning_article_grammar_points
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "user_word_progress_own"
  on public.user_word_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_lesson_progress_own"
  on public.user_lesson_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_article_progress_own"
  on public.user_article_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_word_memory_own"
  on public.user_word_memory
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_learning_stats_own"
  on public.user_learning_stats
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_reading_progress_own"
  on public.user_reading_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_writing_progress_own"
  on public.user_writing_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "review_events_own"
  on public.review_events
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "practice_events_own"
  on public.practice_events
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_xp_own"
  on public.user_xp
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_level_own"
  on public.user_level
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_achievements_own"
  on public.user_achievements
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_xp_events_own"
  on public.user_xp_events
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vocab_sync_batches_admin"
  on public.vocab_sync_batches
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "vocab_sync_rows_admin"
  on public.vocab_sync_rows
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "vocab_sync_apply_events_admin"
  on public.vocab_sync_apply_events
  for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
