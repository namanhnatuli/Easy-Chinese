do $$
begin
  if not exists (select 1 from pg_type where typname = 'practice_progress_status') then
    create type public.practice_progress_status as enum ('new', 'practicing', 'completed', 'difficult');
  end if;

  if not exists (select 1 from pg_type where typname = 'reading_practice_type') then
    create type public.reading_practice_type as enum ('word', 'sentence');
  end if;

  if not exists (select 1 from pg_type where typname = 'practice_event_type') then
    create type public.practice_event_type as enum ('reading_word', 'reading_sentence', 'writing_character');
  end if;

  if not exists (select 1 from pg_type where typname = 'practice_event_result') then
    create type public.practice_event_result as enum ('completed', 'difficult', 'skipped');
  end if;
end
$$;

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
    (practice_type = 'word'::public.reading_practice_type and word_id is not null and example_id is null)
    or
    (practice_type = 'sentence'::public.reading_practice_type and example_id is not null and word_id is null)
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

create table public.practice_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid references public.words(id) on delete cascade,
  example_id uuid references public.word_examples(id) on delete cascade,
  practice_type public.practice_event_type not null,
  result public.practice_event_result not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint practice_events_target_check check (
    (practice_type = 'reading_word'::public.practice_event_type and word_id is not null and example_id is null)
    or
    (practice_type = 'reading_sentence'::public.practice_event_type and example_id is not null and word_id is null)
    or
    (practice_type = 'writing_character'::public.practice_event_type and word_id is not null and example_id is null)
  )
);

create unique index user_reading_progress_user_word_unique_idx
  on public.user_reading_progress(user_id, word_id)
  where practice_type = 'word'::public.reading_practice_type;

create unique index user_reading_progress_user_example_unique_idx
  on public.user_reading_progress(user_id, example_id)
  where practice_type = 'sentence'::public.reading_practice_type;

create index user_reading_progress_user_type_status_idx
  on public.user_reading_progress(user_id, practice_type, status);

create index user_reading_progress_user_last_practiced_idx
  on public.user_reading_progress(user_id, last_practiced_at desc);

create index user_writing_progress_user_status_idx
  on public.user_writing_progress(user_id, status);

create index user_writing_progress_user_last_practiced_idx
  on public.user_writing_progress(user_id, last_practiced_at desc);

create index user_writing_progress_user_word_idx
  on public.user_writing_progress(user_id, word_id);

create index practice_events_user_created_idx
  on public.practice_events(user_id, created_at desc);

create index practice_events_type_created_idx
  on public.practice_events(practice_type, created_at desc);

create trigger user_reading_progress_set_updated_at
before update on public.user_reading_progress
for each row execute function public.set_updated_at();

create trigger user_writing_progress_set_updated_at
before update on public.user_writing_progress
for each row execute function public.set_updated_at();

alter table public.user_reading_progress enable row level security;
alter table public.user_writing_progress enable row level security;
alter table public.practice_events enable row level security;

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

create policy "practice_events_own"
on public.practice_events
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
