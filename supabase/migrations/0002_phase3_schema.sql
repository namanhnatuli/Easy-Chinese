create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'progress_status'
  ) then
    create type public.progress_status as enum ('new', 'learning', 'review', 'mastered');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'review_mode'
  ) then
    create type public.review_mode as enum ('flashcard', 'multiple_choice', 'typing');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'review_result'
  ) then
    create type public.review_result as enum ('correct', 'incorrect', 'skipped');
  end if;
end
$$;

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

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.radicals (
  id uuid primary key default gen_random_uuid(),
  radical text not null,
  pinyin text,
  meaning_vi text not null,
  stroke_count integer not null check (stroke_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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

create table if not exists public.lesson_words (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (lesson_id, word_id),
  constraint lesson_words_lesson_sort_unique unique (lesson_id, sort_order)
);

create table if not exists public.lesson_grammar_points (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  grammar_point_id uuid not null references public.grammar_points(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (lesson_id, grammar_point_id),
  constraint lesson_grammar_points_lesson_sort_unique unique (lesson_id, sort_order)
);

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

create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  mode public.review_mode not null,
  result public.review_result not null,
  reviewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists topics_slug_idx on public.topics(slug);
create index if not exists radicals_radical_idx on public.radicals(radical);
create index if not exists words_slug_idx on public.words(slug);
create index if not exists words_hsk_level_idx on public.words(hsk_level);
create index if not exists words_topic_id_idx on public.words(topic_id);
create index if not exists words_radical_id_idx on public.words(radical_id);
create index if not exists words_is_published_idx on public.words(is_published);
create index if not exists word_examples_word_id_idx on public.word_examples(word_id);
create index if not exists grammar_points_slug_idx on public.grammar_points(slug);
create index if not exists grammar_points_hsk_level_idx on public.grammar_points(hsk_level);
create index if not exists grammar_points_is_published_idx on public.grammar_points(is_published);
create index if not exists grammar_examples_grammar_point_id_idx on public.grammar_examples(grammar_point_id);
create index if not exists lessons_slug_idx on public.lessons(slug);
create index if not exists lessons_hsk_level_idx on public.lessons(hsk_level);
create index if not exists lessons_topic_id_idx on public.lessons(topic_id);
create index if not exists lessons_is_published_idx on public.lessons(is_published);
create index if not exists lesson_words_word_id_idx on public.lesson_words(word_id);
create index if not exists lesson_grammar_points_grammar_point_id_idx on public.lesson_grammar_points(grammar_point_id);
create index if not exists user_word_progress_user_id_idx on public.user_word_progress(user_id);
create index if not exists user_word_progress_word_id_idx on public.user_word_progress(word_id);
create index if not exists user_word_progress_next_review_at_idx on public.user_word_progress(next_review_at);
create index if not exists user_lesson_progress_user_id_idx on public.user_lesson_progress(user_id);
create index if not exists user_lesson_progress_lesson_id_idx on public.user_lesson_progress(lesson_id);
create index if not exists review_events_user_id_idx on public.review_events(user_id);
create index if not exists review_events_word_id_idx on public.review_events(word_id);
create index if not exists review_events_reviewed_at_idx on public.review_events(reviewed_at desc);

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at
before update on public.topics
for each row execute function public.set_updated_at();

drop trigger if exists radicals_set_updated_at on public.radicals;
create trigger radicals_set_updated_at
before update on public.radicals
for each row execute function public.set_updated_at();

drop trigger if exists words_set_updated_at on public.words;
create trigger words_set_updated_at
before update on public.words
for each row execute function public.set_updated_at();

drop trigger if exists word_examples_set_updated_at on public.word_examples;
create trigger word_examples_set_updated_at
before update on public.word_examples
for each row execute function public.set_updated_at();

drop trigger if exists grammar_points_set_updated_at on public.grammar_points;
create trigger grammar_points_set_updated_at
before update on public.grammar_points
for each row execute function public.set_updated_at();

drop trigger if exists grammar_examples_set_updated_at on public.grammar_examples;
create trigger grammar_examples_set_updated_at
before update on public.grammar_examples
for each row execute function public.set_updated_at();

drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

drop trigger if exists user_word_progress_set_updated_at on public.user_word_progress;
create trigger user_word_progress_set_updated_at
before update on public.user_word_progress
for each row execute function public.set_updated_at();

drop trigger if exists user_lesson_progress_set_updated_at on public.user_lesson_progress;
create trigger user_lesson_progress_set_updated_at
before update on public.user_lesson_progress
for each row execute function public.set_updated_at();

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

drop policy if exists "topics_public_read" on public.topics;
create policy "topics_public_read"
on public.topics
for select
to public
using (true);

drop policy if exists "topics_admin_write" on public.topics;
create policy "topics_admin_write"
on public.topics
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "radicals_public_read" on public.radicals;
create policy "radicals_public_read"
on public.radicals
for select
to public
using (true);

drop policy if exists "radicals_admin_write" on public.radicals;
create policy "radicals_admin_write"
on public.radicals
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "words_public_read_published" on public.words;
create policy "words_public_read_published"
on public.words
for select
to public
using (is_published or public.is_admin());

drop policy if exists "words_admin_write" on public.words;
create policy "words_admin_write"
on public.words
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "word_examples_public_read" on public.word_examples;
create policy "word_examples_public_read"
on public.word_examples
for select
to public
using (
  exists (
    select 1
    from public.words
    where words.id = word_examples.word_id
      and (words.is_published or public.is_admin())
  )
);

drop policy if exists "word_examples_admin_write" on public.word_examples;
create policy "word_examples_admin_write"
on public.word_examples
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "grammar_points_public_read_published" on public.grammar_points;
create policy "grammar_points_public_read_published"
on public.grammar_points
for select
to public
using (is_published or public.is_admin());

drop policy if exists "grammar_points_admin_write" on public.grammar_points;
create policy "grammar_points_admin_write"
on public.grammar_points
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "grammar_examples_public_read" on public.grammar_examples;
create policy "grammar_examples_public_read"
on public.grammar_examples
for select
to public
using (
  exists (
    select 1
    from public.grammar_points
    where grammar_points.id = grammar_examples.grammar_point_id
      and (grammar_points.is_published or public.is_admin())
  )
);

drop policy if exists "grammar_examples_admin_write" on public.grammar_examples;
create policy "grammar_examples_admin_write"
on public.grammar_examples
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "lessons_public_read_published" on public.lessons;
create policy "lessons_public_read_published"
on public.lessons
for select
to public
using (is_published or public.is_admin());

drop policy if exists "lessons_admin_write" on public.lessons;
create policy "lessons_admin_write"
on public.lessons
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "lesson_words_public_read" on public.lesson_words;
create policy "lesson_words_public_read"
on public.lesson_words
for select
to public
using (
  exists (
    select 1
    from public.lessons
    join public.words on words.id = lesson_words.word_id
    where lessons.id = lesson_words.lesson_id
      and (lessons.is_published or public.is_admin())
      and (words.is_published or public.is_admin())
  )
);

drop policy if exists "lesson_words_admin_write" on public.lesson_words;
create policy "lesson_words_admin_write"
on public.lesson_words
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "lesson_grammar_points_public_read" on public.lesson_grammar_points;
create policy "lesson_grammar_points_public_read"
on public.lesson_grammar_points
for select
to public
using (
  exists (
    select 1
    from public.lessons
    join public.grammar_points on grammar_points.id = lesson_grammar_points.grammar_point_id
    where lessons.id = lesson_grammar_points.lesson_id
      and (lessons.is_published or public.is_admin())
      and (grammar_points.is_published or public.is_admin())
  )
);

drop policy if exists "lesson_grammar_points_admin_write" on public.lesson_grammar_points;
create policy "lesson_grammar_points_admin_write"
on public.lesson_grammar_points
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "user_word_progress_own_read" on public.user_word_progress;
create policy "user_word_progress_own_read"
on public.user_word_progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_word_progress_own_insert" on public.user_word_progress;
create policy "user_word_progress_own_insert"
on public.user_word_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_word_progress_own_update" on public.user_word_progress;
create policy "user_word_progress_own_update"
on public.user_word_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_word_progress_own_delete" on public.user_word_progress;
create policy "user_word_progress_own_delete"
on public.user_word_progress
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_lesson_progress_own_read" on public.user_lesson_progress;
create policy "user_lesson_progress_own_read"
on public.user_lesson_progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_lesson_progress_own_insert" on public.user_lesson_progress;
create policy "user_lesson_progress_own_insert"
on public.user_lesson_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_lesson_progress_own_update" on public.user_lesson_progress;
create policy "user_lesson_progress_own_update"
on public.user_lesson_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_lesson_progress_own_delete" on public.user_lesson_progress;
create policy "user_lesson_progress_own_delete"
on public.user_lesson_progress
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "review_events_own_read" on public.review_events;
create policy "review_events_own_read"
on public.review_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "review_events_own_insert" on public.review_events;
create policy "review_events_own_insert"
on public.review_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "review_events_own_delete" on public.review_events;
create policy "review_events_own_delete"
on public.review_events
for delete
to authenticated
using (auth.uid() = user_id);
