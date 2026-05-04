alter table public.lesson_words
  add column if not exists sense_id uuid references public.word_senses(id) on delete set null;

create index if not exists lesson_words_sense_id_idx on public.lesson_words(sense_id);

alter table public.user_word_progress
  add column if not exists sense_id uuid references public.word_senses(id) on delete set null;

alter table public.user_word_progress
  drop constraint if exists user_word_progress_user_word_unique;

drop index if exists user_word_progress_user_word_unique_idx;

create unique index if not exists user_word_progress_user_word_legacy_unique_idx
  on public.user_word_progress(user_id, word_id)
  where sense_id is null;

create unique index if not exists user_word_progress_user_word_sense_unique_idx
  on public.user_word_progress(user_id, word_id, sense_id)
  where sense_id is not null;

create index if not exists user_word_progress_user_sense_next_review_idx
  on public.user_word_progress(user_id, sense_id, next_review_at);

alter table public.user_word_memory
  add column if not exists sense_id uuid references public.word_senses(id) on delete set null;

alter table public.user_word_memory
  drop constraint if exists user_word_memory_user_word_unique;

drop index if exists user_word_memory_user_word_unique_idx;

create unique index if not exists user_word_memory_user_word_legacy_unique_idx
  on public.user_word_memory(user_id, word_id)
  where sense_id is null;

create unique index if not exists user_word_memory_user_word_sense_unique_idx
  on public.user_word_memory(user_id, word_id, sense_id)
  where sense_id is not null;

create index if not exists user_word_memory_user_sense_due_idx
  on public.user_word_memory(user_id, sense_id, due_at asc);

alter table public.user_reading_progress
  add column if not exists sense_id uuid references public.word_senses(id) on delete set null;

drop index if exists user_reading_progress_user_word_unique_idx;

create unique index if not exists user_reading_progress_user_word_legacy_unique_idx
  on public.user_reading_progress(user_id, word_id)
  where practice_type = 'word' and sense_id is null;

create unique index if not exists user_reading_progress_user_word_sense_unique_idx
  on public.user_reading_progress(user_id, word_id, sense_id)
  where practice_type = 'word' and sense_id is not null;

create index if not exists user_reading_progress_sense_idx
  on public.user_reading_progress(user_id, sense_id, last_practiced_at desc);

alter table public.review_events
  add column if not exists sense_id uuid references public.word_senses(id) on delete set null;

create index if not exists review_events_user_sense_reviewed_at_idx
  on public.review_events(user_id, sense_id, reviewed_at desc);

alter table public.practice_events
  add column if not exists sense_id uuid references public.word_senses(id) on delete set null;

create index if not exists practice_events_user_sense_created_idx
  on public.practice_events(user_id, sense_id, created_at desc);
