alter table public.user_word_memory
  rename column interval to interval_days;

alter table public.user_word_memory
  rename column repetition_count to reps;

alter table public.user_word_memory
  rename column next_review_at to due_at;

alter table public.user_word_memory
  add column state text,
  add column lapses integer not null default 0 check (lapses >= 0),
  add column learning_step_index integer not null default 0 check (learning_step_index >= 0),
  add column last_grade text;

update public.user_word_memory
set state = case
  when due_at is null and reps = 0 then 'new'
  else 'review'
end
where state is null;

alter table public.user_word_memory
  alter column state set not null,
  add constraint user_word_memory_state_check check (state in ('new', 'learning', 'review', 'relearning')),
  add constraint user_word_memory_last_grade_check check (
    last_grade is null or last_grade in ('again', 'hard', 'good', 'easy')
  );

drop index if exists user_word_memory_user_next_review_idx;
drop index if exists user_word_memory_user_repetition_idx;

create index user_word_memory_user_due_idx
  on public.user_word_memory(user_id, due_at asc);

create index user_word_memory_user_state_due_idx
  on public.user_word_memory(user_id, state, due_at asc);

alter table public.review_events
  alter column mode drop not null,
  alter column result drop not null,
  add column practice_type text,
  add column grade text,
  add column previous_state text,
  add column next_state text,
  add column previous_interval_days integer,
  add column next_interval_days integer,
  add column previous_due_at timestamptz,
  add column next_due_at timestamptz;

update public.review_events
set
  practice_type = coalesce(practice_type, concat('review_', mode::text)),
  grade = coalesce(
    grade,
    case
      when result = 'correct' then 'good'
      when result = 'incorrect' then 'again'
      else 'again'
    end
  )
where practice_type is null or grade is null;

alter table public.review_events
  alter column practice_type set not null,
  alter column grade set not null,
  add constraint review_events_grade_check check (grade in ('again', 'hard', 'good', 'easy')),
  add constraint review_events_previous_state_check check (
    previous_state is null or previous_state in ('new', 'learning', 'review', 'relearning')
  ),
  add constraint review_events_next_state_check check (
    next_state is null or next_state in ('new', 'learning', 'review', 'relearning')
  );

create index review_events_user_due_history_idx
  on public.review_events(user_id, reviewed_at desc, grade);
