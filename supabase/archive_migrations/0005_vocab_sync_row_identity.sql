-- ==========================================
-- VOCAB SYNC ROW IDENTITY ADJUSTMENT
-- ==========================================

alter table public.vocab_sync_rows
  drop constraint if exists vocab_sync_rows_batch_source_row_key_unique;

create unique index if not exists vocab_sync_rows_batch_source_row_number_unique_idx
  on public.vocab_sync_rows(batch_id, source_row_number)
  where source_row_number is not null;

create index if not exists vocab_sync_rows_batch_source_row_key_idx
  on public.vocab_sync_rows(batch_id, source_row_key);
