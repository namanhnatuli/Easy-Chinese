-- ==========================================
-- INITIAL DATABASE SCHEMA
-- ==========================================

-- Extensions
create extension if not exists pgcrypto with schema extensions;

-- ==========================================
-- CUSTOM TYPES
-- ==========================================

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
end
$$;

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Profiles
create table if not exists public.profiles (
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
  constraint profiles_preferred_theme_check
    check (preferred_theme in ('light', 'dark', 'system')),
  constraint profiles_preferred_font_check
    check (preferred_font in ('sans', 'serif', 'kai'))
);

-- Content: Topics
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Content: Radicals
create table if not exists public.radicals (
  id uuid primary key default gen_random_uuid(),
  radical text not null,
  pinyin text,
  meaning_vi text not null,
  stroke_count integer not null check (stroke_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Content: Words
create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  simplified text not null,
  traditional text,
  hanzi text not null,
  pinyin text not null,
  han_viet text,
  vietnamese_meaning text not null,
  english_meaning text,
  hsk_level integer not null check (hsk_level between 1 and 9),
  topic_id uuid references public.topics(id) on delete set null,
  radical_id uuid references public.radicals(id) on delete set null,
  notes text,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Content: Word Examples
create table if not exists public.word_examples (
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

-- Content: Grammar Points
create table if not exists public.grammar_points (
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

-- Content: Grammar Examples
create table if not exists public.grammar_examples (
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

-- Content: Lessons
create table if not exists public.lessons (
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
create table if not exists public.lesson_words (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (lesson_id, word_id),
  constraint lesson_words_lesson_sort_unique unique (lesson_id, sort_order)
);

-- Links: Lesson-Grammar
create table if not exists public.lesson_grammar_points (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (lesson_id, grammar_point_id),
  constraint lesson_grammar_points_lesson_sort_unique unique (lesson_id, sort_order)
);

-- Progress: User Word Progress
create table if not exists public.user_word_progress (
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

-- Progress: User Lesson Progress
create table if not exists public.user_lesson_progress (
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

-- Events: Review Events
create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  mode public.review_mode not null,
  result public.review_result not null,
  reviewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Updated at automation
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Admin check (Now references public.profiles which exists)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'::public.app_role
  );
$$;

-- ==========================================
-- SECURITY TRIGGER FUNCTIONS
-- ==========================================

-- New user registration handler
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url',
    'user'::public.app_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

-- Prevent self-promotion to admin
create or replace function public.prevent_profile_role_self_change()
returns trigger
language plpgsql
as $$
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
end;
$$;

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Updated_At triggers
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger topics_set_updated_at before update on public.topics for each row execute function public.set_updated_at();
create trigger radicals_set_updated_at before update on public.radicals for each row execute function public.set_updated_at();
create trigger words_set_updated_at before update on public.words for each row execute function public.set_updated_at();
create trigger word_examples_set_updated_at before update on public.word_examples for each row execute function public.set_updated_at();
create trigger grammar_points_set_updated_at before update on public.grammar_points for each row execute function public.set_updated_at();
create trigger grammar_examples_set_updated_at before update on public.grammar_examples for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons for each row execute function public.set_updated_at();
create trigger user_word_progress_set_updated_at before update on public.user_word_progress for each row execute function public.set_updated_at();
create trigger user_lesson_progress_set_updated_at before update on public.user_lesson_progress for each row execute function public.set_updated_at();

-- Auth trigger
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Profile security trigger
create trigger profiles_prevent_role_self_change
before insert or update on public.profiles
for each row
execute function public.prevent_profile_role_self_change();

-- ==========================================
-- INDICES
-- ==========================================

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists topics_slug_idx on public.topics(slug);
create index if not exists radicals_radical_idx on public.radicals(radical);
create index if not exists words_slug_idx on public.words(slug);
create index if not exists words_hsk_level_idx on public.words(hsk_level);
create index if not exists words_topic_id_idx on public.words(topic_id);
create index if not exists words_radical_id_idx on public.words(radical_id);
create index if not exists words_is_published_idx on public.words(is_published);
create index if not exists word_examples_word_id_idx on public.word_examples(word_id);
create index if not exists grammar_points_slug_idx on public.grammar_points(slug);
create index if not exists grammar_points_is_published_idx on public.grammar_points(is_published);
create index if not exists lessons_slug_idx on public.lessons(slug);
create index if not exists lessons_is_published_idx on public.lessons(is_published);
create index if not exists user_word_progress_user_id_idx on public.user_word_progress(user_id);
create index if not exists user_word_progress_next_review_at_idx on public.user_word_progress(next_review_at);
create index if not exists user_word_progress_user_id_next_review_at_idx on public.user_word_progress(user_id, next_review_at);
create index if not exists review_events_user_id_reviewed_at_idx on public.review_events(user_id, reviewed_at desc);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================

alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.radicals enable row level security;
alter table public.words enable row level security;
alter table public.word_examples enable row level security;
alter table public.grammar_points enable row level security;
alter table public.grammar_examples enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_words enable row level security;
alter table public.lesson_grammar_points enable row level security;
alter table public.user_word_progress enable row level security;
alter table public.user_lesson_progress enable row level security;
alter table public.review_events enable row level security;

-- Policies for PROFILES
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id and role = 'user'::public.app_role);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Policies for CONTENT (Public Read, Admin Write)
create policy "topics_public_read" on public.topics for select to public using (true);
create policy "topics_admin_write" on public.topics for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "radicals_public_read" on public.radicals for select to public using (true);
create policy "radicals_admin_write" on public.radicals for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "words_public_read_published" on public.words for select to public using (is_published or public.is_admin());
create policy "words_admin_write" on public.words for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "word_examples_public_read" on public.word_examples for select to public using (exists (select 1 from public.words where words.id = word_examples.word_id and (words.is_published or public.is_admin())));
create policy "word_examples_admin_write" on public.word_examples for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "grammar_points_public_read_published" on public.grammar_points for select to public using (is_published or public.is_admin());
create policy "grammar_points_admin_write" on public.grammar_points for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "grammar_examples_public_read" on public.grammar_examples for select to public using (exists (select 1 from public.grammar_points where grammar_points.id = grammar_examples.grammar_point_id and (grammar_points.is_published or public.is_admin())));
create policy "grammar_examples_admin_write" on public.grammar_examples for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "lessons_public_read_published" on public.lessons for select to public using (is_published or public.is_admin());
create policy "lessons_admin_write" on public.lessons for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "lesson_words_public_read" on public.lesson_words for select to public using (exists (select 1 from public.lessons join public.words on words.id = lesson_words.word_id where lessons.id = lesson_words.lesson_id and (lessons.is_published or public.is_admin()) and (words.is_published or public.is_admin())));
create policy "lesson_words_admin_write" on public.lesson_words for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "lesson_grammar_points_public_read" on public.lesson_grammar_points for select to public using (exists (select 1 from public.lessons join public.grammar_points on grammar_points.id = lesson_grammar_points.grammar_point_id where lessons.id = lesson_grammar_points.lesson_id and (lessons.is_published or public.is_admin()) and (grammar_points.is_published or public.is_admin())));
create policy "lesson_grammar_points_admin_write" on public.lesson_grammar_points for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Policies for PROGRESS (Owner Management)
create policy "user_word_progress_own" on public.user_word_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_lesson_progress_own" on public.user_lesson_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "review_events_own" on public.review_events for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
