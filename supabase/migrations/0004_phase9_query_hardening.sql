create index if not exists user_word_progress_user_id_next_review_at_idx
on public.user_word_progress(user_id, next_review_at);

create index if not exists review_events_user_id_reviewed_at_idx
on public.review_events(user_id, reviewed_at desc);
