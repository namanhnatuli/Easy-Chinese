alter type public.practice_event_type add value if not exists 'listening_dictation';
alter type public.practice_event_result add value if not exists 'correct';
alter type public.practice_event_result add value if not exists 'almost';
alter type public.practice_event_result add value if not exists 'incorrect';

alter table public.practice_events
add column if not exists tts_audio_cache_id uuid references public.tts_audio_cache(id) on delete cascade;

alter table public.practice_events
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.practice_events
drop constraint if exists practice_events_target_check;

alter table public.practice_events
add constraint practice_events_target_check check (
  (practice_type = 'reading_word' and word_id is not null and example_id is null and tts_audio_cache_id is null)
  or
  (practice_type = 'reading_sentence' and example_id is not null and word_id is null and tts_audio_cache_id is null)
  or
  (practice_type = 'writing_character' and word_id is not null and example_id is null and tts_audio_cache_id is null)
  or
  (practice_type = 'listening_dictation' and tts_audio_cache_id is not null and word_id is null and example_id is null)
);

create table public.user_listening_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tts_audio_cache_id uuid not null references public.tts_audio_cache(id) on delete cascade,
  status public.practice_progress_status not null default 'new',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  almost_count integer not null default 0 check (almost_count >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  best_score numeric(6,4) not null default 0 check (best_score >= 0 and best_score <= 1),
  last_input text,
  last_practiced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_listening_progress_user_audio_unique unique (user_id, tts_audio_cache_id)
);

create index user_listening_progress_user_status_idx
  on public.user_listening_progress(user_id, status, last_practiced_at desc nulls last);

create index user_listening_progress_audio_idx
  on public.user_listening_progress(tts_audio_cache_id);

create index practice_events_listening_created_idx
  on public.practice_events(user_id, created_at desc)
  where practice_type = 'listening_dictation';

create trigger user_listening_progress_set_updated_at
before update on public.user_listening_progress
for each row execute function public.set_updated_at();

alter table public.user_listening_progress enable row level security;

create policy "user_listening_progress_own"
  on public.user_listening_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
