-- Grammar sync schema.
-- Business/apply logic stays in application code; this migration only adds storage,
-- constraints, indexes, RLS, and timestamp triggers using the existing utility trigger.

alter table public.grammar_points
  add column if not exists source_confidence public.source_confidence_level,
  add column if not exists ambiguity_flag boolean not null default false,
  add column if not exists ambiguity_note text,
  add column if not exists review_status public.vocab_review_status not null default 'pending',
  add column if not exists ai_status public.vocab_ai_status not null default 'pending',
  add column if not exists external_source text,
  add column if not exists external_id text,
  add column if not exists source_row_key text,
  add column if not exists content_hash text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_source_updated_at timestamptz;

create index if not exists grammar_points_review_status_idx on public.grammar_points(review_status);
create index if not exists grammar_points_ai_status_idx on public.grammar_points(ai_status);
create index if not exists grammar_points_source_row_key_idx on public.grammar_points(source_row_key);
create index if not exists grammar_points_external_identity_idx on public.grammar_points(external_source, external_id);

create table if not exists public.grammar_sync_batches (
  id uuid primary key default gen_random_uuid(),
  external_source text not null default 'google_sheets',
  source_document_id text,
  source_sheet_name text,
  source_sheet_gid text,
  status public.vocab_sync_batch_status not null default 'pending',
  initiated_by uuid references public.profiles(id) on delete set null,
  raw_batch_payload jsonb,
  total_rows integer not null default 0 check (total_rows >= 0),
  pending_rows integer not null default 0 check (pending_rows >= 0),
  approved_rows integer not null default 0 check (approved_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  applied_rows integer not null default 0 check (applied_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.grammar_sync_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.grammar_sync_batches(id) on delete cascade,
  external_source text not null default 'google_sheets',
  external_id text,
  source_row_key text not null,
  source_row_number integer,
  source_updated_at timestamptz,
  raw_payload jsonb not null,
  normalized_payload jsonb not null default '{}'::jsonb,
  admin_edited_payload jsonb,
  content_hash text,
  change_classification public.vocab_sync_change_kind not null default 'new',
  match_result text check (match_result in ('slug', 'source_row_key', 'title_structure', 'none', 'conflict')),
  matched_grammar_ids uuid[] not null default '{}'::uuid[],
  parse_errors jsonb not null default '[]'::jsonb,
  review_status public.vocab_review_status not null default 'pending',
  ai_status public.vocab_ai_status not null default 'pending',
  source_confidence public.source_confidence_level,
  diff_summary jsonb,
  review_note text,
  apply_status public.vocab_sync_apply_status not null default 'pending',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  applied_grammar_id uuid references public.grammar_points(id) on delete set null,
  applied_by uuid references public.profiles(id) on delete set null,
  applied_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.grammar_sync_apply_events (
  id uuid primary key default gen_random_uuid(),
  sync_row_id uuid not null references public.grammar_sync_rows(id) on delete cascade,
  batch_id uuid not null references public.grammar_sync_batches(id) on delete cascade,
  grammar_point_id uuid references public.grammar_points(id) on delete cascade,
  operation text,
  status public.vocab_sync_apply_status not null default 'pending',
  payload_snapshot jsonb,
  result_snapshot jsonb,
  error_message text,
  applied_by uuid references public.profiles(id) on delete set null,
  applied_at timestamptz not null default timezone('utc', now())
);

create index if not exists grammar_sync_batches_status_idx on public.grammar_sync_batches(status);
create index if not exists grammar_sync_rows_batch_idx on public.grammar_sync_rows(batch_id);
create index if not exists grammar_sync_rows_source_key_idx on public.grammar_sync_rows(source_row_key);
create index if not exists grammar_sync_rows_review_status_idx on public.grammar_sync_rows(review_status);
create index if not exists grammar_sync_rows_apply_status_idx on public.grammar_sync_rows(apply_status);
create index if not exists grammar_sync_rows_change_idx on public.grammar_sync_rows(change_classification);
create index if not exists grammar_sync_apply_events_row_idx on public.grammar_sync_apply_events(sync_row_id);

drop trigger if exists grammar_sync_batches_set_updated_at on public.grammar_sync_batches;
create trigger grammar_sync_batches_set_updated_at
  before update on public.grammar_sync_batches
  for each row execute function public.set_updated_at();

drop trigger if exists grammar_sync_rows_set_updated_at on public.grammar_sync_rows;
create trigger grammar_sync_rows_set_updated_at
  before update on public.grammar_sync_rows
  for each row execute function public.set_updated_at();

alter table public.grammar_sync_batches enable row level security;
alter table public.grammar_sync_rows enable row level security;
alter table public.grammar_sync_apply_events enable row level security;

drop policy if exists "grammar_sync_batches_admin" on public.grammar_sync_batches;
create policy "grammar_sync_batches_admin" on public.grammar_sync_batches
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "grammar_sync_rows_admin" on public.grammar_sync_rows;
create policy "grammar_sync_rows_admin" on public.grammar_sync_rows
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "grammar_sync_apply_events_admin" on public.grammar_sync_apply_events;
create policy "grammar_sync_apply_events_admin" on public.grammar_sync_apply_events
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
