alter table public.user_word_memory
  add column scheduler_type text not null default 'sm2',
  add column fsrs_stability numeric(12,4),
  add column fsrs_difficulty numeric(12,4),
  add column fsrs_retrievability numeric(12,6),
  add column scheduled_days integer not null default 0,
  add column elapsed_days integer not null default 0;

alter table public.user_word_memory
  add constraint user_word_memory_scheduler_type_check check (scheduler_type in ('sm2', 'fsrs')),
  add constraint user_word_memory_scheduled_days_check check (scheduled_days >= 0),
  add constraint user_word_memory_elapsed_days_check check (elapsed_days >= 0);

create index user_word_memory_user_scheduler_due_idx
  on public.user_word_memory(user_id, scheduler_type, due_at asc);

alter table public.user_learning_stats
  add column scheduler_type text not null default 'sm2',
  add column desired_retention numeric(4,2) not null default 0.90,
  add column maximum_interval_days integer not null default 36500;

alter table public.user_learning_stats
  add constraint user_learning_stats_scheduler_type_check check (scheduler_type in ('sm2', 'fsrs')),
  add constraint user_learning_stats_desired_retention_check check (desired_retention >= 0.70 and desired_retention <= 0.99),
  add constraint user_learning_stats_maximum_interval_days_check check (maximum_interval_days >= 1 and maximum_interval_days <= 36500);

alter table public.review_events
  add column scheduler_type text not null default 'sm2',
  add column previous_stability numeric(12,4),
  add column next_stability numeric(12,4),
  add column previous_difficulty numeric(12,4),
  add column next_difficulty numeric(12,4),
  add column previous_retrievability numeric(12,6),
  add column next_retrievability numeric(12,6);

alter table public.review_events
  add constraint review_events_scheduler_type_check check (scheduler_type in ('sm2', 'fsrs'));

create index review_events_user_scheduler_history_idx
  on public.review_events(user_id, reviewed_at desc, scheduler_type, grade);
