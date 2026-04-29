alter table public.user_word_memory
  drop constraint if exists user_word_memory_interval_check;

alter table public.user_word_memory
  alter column interval_days set default 0,
  add constraint user_word_memory_interval_days_check check (interval_days >= 0);
