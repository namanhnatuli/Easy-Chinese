-- ==========================================
-- VOCAB SYNC PREVIEW SUPPORT FIELDS
-- ==========================================

alter table public.vocab_sync_rows
  add column if not exists source_row_number integer,
  add column if not exists parse_errors jsonb not null default '[]'::jsonb,
  add column if not exists matched_word_ids uuid[] not null default '{}'::uuid[],
  add column if not exists match_result text;

create index if not exists vocab_sync_rows_source_row_number_idx
  on public.vocab_sync_rows(batch_id, source_row_number);

create index if not exists vocab_sync_rows_match_result_idx
  on public.vocab_sync_rows(match_result);
