"use server";

import { requireAdminSupabase } from "@/features/admin/shared";
import type {
  GrammarSyncBatch,
  GrammarSyncMatchResult,
  GrammarSyncRow,
} from "@/features/grammar-sync/types";
import type {
  VocabSyncBatchStatus,
} from "@/features/vocabulary-sync/types";

const batchSelect =
  "id, external_source, source_document_id, source_sheet_name, source_sheet_gid, status, initiated_by, raw_batch_payload, total_rows, pending_rows, approved_rows, rejected_rows, applied_rows, error_rows, notes, started_at, completed_at, created_at, updated_at";

const rowSelect =
  "id, batch_id, external_source, external_id, source_row_key, source_row_number, source_updated_at, raw_payload, normalized_payload, admin_edited_payload, content_hash, change_classification, match_result, matched_grammar_ids, parse_errors, review_status, ai_status, source_confidence, diff_summary, review_note, apply_status, approved_by, approved_at, applied_grammar_id, applied_by, applied_at, error_message, created_at, updated_at";

function mapBatch(row: any): GrammarSyncBatch {
  return {
    id: row.id,
    externalSource: row.external_source,
    sourceDocumentId: row.source_document_id,
    sourceSheetName: row.source_sheet_name,
    sourceSheetGid: row.source_sheet_gid,
    status: row.status,
    initiatedBy: row.initiated_by,
    rawBatchPayload: row.raw_batch_payload,
    totalRows: row.total_rows,
    pendingRows: row.pending_rows,
    approvedRows: row.approved_rows,
    rejectedRows: row.rejected_rows,
    appliedRows: row.applied_rows,
    errorRows: row.error_rows,
    notes: row.notes,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRow(row: any): GrammarSyncRow {
  return {
    id: row.id,
    batchId: row.batch_id,
    externalSource: row.external_source,
    externalId: row.external_id,
    sourceRowKey: row.source_row_key,
    sourceRowNumber: row.source_row_number,
    sourceUpdatedAt: row.source_updated_at,
    rawPayload: row.raw_payload,
    normalizedPayload: row.normalized_payload,
    adminEditedPayload: row.admin_edited_payload,
    contentHash: row.content_hash,
    changeClassification: row.change_classification,
    matchResult: row.match_result,
    matchedGrammarIds: row.matched_grammar_ids,
    parseErrors: row.parse_errors,
    reviewStatus: row.review_status,
    aiStatus: row.ai_status,
    sourceConfidence: row.source_confidence,
    diffSummary: row.diff_summary,
    reviewNote: row.review_note,
    applyStatus: row.apply_status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    appliedGrammarId: row.applied_grammar_id,
    appliedBy: row.applied_by,
    appliedAt: row.applied_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createGrammarSyncBatch(input: {
  externalSource?: string;
  sourceDocumentId?: string | null;
  sourceSheetName?: string | null;
  sourceSheetGid?: string | null;
  rawBatchPayload?: Record<string, unknown> | null;
  notes?: string | null;
  totalRows?: number;
}) {
  const { supabase, auth } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_sync_batches")
    .insert({
      external_source: input.externalSource ?? "google_sheets",
      source_document_id: input.sourceDocumentId ?? null,
      source_sheet_name: input.sourceSheetName ?? null,
      source_sheet_gid: input.sourceSheetGid ?? null,
      initiated_by: auth.user?.id ?? null,
      raw_batch_payload: input.rawBatchPayload ?? null,
      notes: input.notes ?? null,
      total_rows: input.totalRows ?? 0,
      pending_rows: input.totalRows ?? 0,
    })
    .select(batchSelect)
    .single();

  if (error) throw error;
  return mapBatch(data);
}

export async function updateGrammarSyncBatch(
  batchId: string,
  patch: Partial<{
    status: VocabSyncBatchStatus;
    totalRows: number;
    pendingRows: number;
    approvedRows: number;
    rejectedRows: number;
    appliedRows: number;
    errorRows: number;
    rawBatchPayload: Record<string, unknown> | null;
    notes: string | null;
    startedAt: string | null;
    completedAt: string | null;
  }>,
) {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_sync_batches")
    .update({
      status: patch.status,
      total_rows: patch.totalRows,
      pending_rows: patch.pendingRows,
      approved_rows: patch.approvedRows,
      rejected_rows: patch.rejectedRows,
      applied_rows: patch.appliedRows,
      error_rows: patch.errorRows,
      raw_batch_payload: patch.rawBatchPayload,
      notes: patch.notes,
      started_at: patch.startedAt,
      completed_at: patch.completedAt,
    })
    .eq("id", batchId)
    .select(batchSelect)
    .single();

  if (error) throw error;
  return mapBatch(data);
}

export async function createGrammarSyncRows(batchId: string, rows: Array<{
  sourceRowKey: string;
  sourceRowNumber?: number | null;
  sourceUpdatedAt?: string | null;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown>;
  contentHash: string | null;
  changeClassification: GrammarSyncRow["changeClassification"];
  matchResult: GrammarSyncMatchResult | null;
  matchedGrammarIds: string[];
  parseErrors: string[];
  reviewStatus: GrammarSyncRow["reviewStatus"];
  aiStatus: GrammarSyncRow["aiStatus"];
  sourceConfidence: GrammarSyncRow["sourceConfidence"];
  diffSummary: Record<string, unknown> | null;
  applyStatus?: GrammarSyncRow["applyStatus"];
  errorMessage?: string | null;
}>) {
  if (rows.length === 0) return [];

  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_sync_rows")
    .insert(rows.map((row) => ({
      batch_id: batchId,
      source_row_key: row.sourceRowKey,
      source_row_number: row.sourceRowNumber ?? null,
      source_updated_at: row.sourceUpdatedAt ?? null,
      raw_payload: row.rawPayload,
      normalized_payload: row.normalizedPayload,
      content_hash: row.contentHash,
      change_classification: row.changeClassification,
      match_result: row.matchResult,
      matched_grammar_ids: row.matchedGrammarIds,
      parse_errors: row.parseErrors,
      review_status: row.reviewStatus,
      ai_status: row.aiStatus,
      source_confidence: row.sourceConfidence,
      diff_summary: row.diffSummary,
      apply_status: row.applyStatus ?? "pending",
      error_message: row.errorMessage ?? null,
    })))
    .select(rowSelect);

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function updateGrammarSyncRow(rowId: string, patch: Partial<{
  batchId: string;
  adminEditedPayload: Record<string, unknown> | null;
  sourceRowKey: string;
  sourceRowNumber: number | null;
  sourceUpdatedAt: string | null;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown>;
  contentHash: string | null;
  changeClassification: GrammarSyncRow["changeClassification"];
  matchResult: GrammarSyncMatchResult | null;
  matchedGrammarIds: string[];
  parseErrors: string[];
  reviewStatus: GrammarSyncRow["reviewStatus"];
  applyStatus: GrammarSyncRow["applyStatus"];
  aiStatus: GrammarSyncRow["aiStatus"];
  sourceConfidence: GrammarSyncRow["sourceConfidence"];
  diffSummary: Record<string, unknown> | null;
  reviewNote: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  appliedGrammarId: string | null;
  appliedBy: string | null;
  appliedAt: string | null;
  errorMessage: string | null;
}>) {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_sync_rows")
    .update({
      batch_id: patch.batchId,
      admin_edited_payload: patch.adminEditedPayload,
      source_row_key: patch.sourceRowKey,
      source_row_number: patch.sourceRowNumber,
      source_updated_at: patch.sourceUpdatedAt,
      raw_payload: patch.rawPayload,
      normalized_payload: patch.normalizedPayload,
      content_hash: patch.contentHash,
      change_classification: patch.changeClassification,
      match_result: patch.matchResult,
      matched_grammar_ids: patch.matchedGrammarIds,
      parse_errors: patch.parseErrors,
      review_status: patch.reviewStatus,
      apply_status: patch.applyStatus,
      ai_status: patch.aiStatus,
      source_confidence: patch.sourceConfidence,
      diff_summary: patch.diffSummary,
      review_note: patch.reviewNote,
      approved_by: patch.approvedBy,
      approved_at: patch.approvedAt,
      applied_grammar_id: patch.appliedGrammarId,
      applied_by: patch.appliedBy,
      applied_at: patch.appliedAt,
      error_message: patch.errorMessage,
    })
    .eq("id", rowId)
    .select(rowSelect)
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function listGrammarSyncBatches(limit = 20) {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_sync_batches")
    .select(batchSelect)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapBatch);
}

export async function getGrammarSyncBatch(batchId: string) {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_sync_batches")
    .select(batchSelect)
    .eq("id", batchId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapBatch(data) : null;
}

export async function listGrammarSyncRows(filters: {
  batchId?: string | null;
  reviewStatuses?: GrammarSyncRow["reviewStatus"][];
  changeType?: GrammarSyncRow["changeClassification"] | null;
  applyStatus?: GrammarSyncRow["applyStatus"] | null;
  limit?: number;
} = {}) {
  const { supabase } = await requireAdminSupabase();
  let query = supabase
    .from("grammar_sync_rows")
    .select(rowSelect)
    .order("created_at", { ascending: false })
    .order("source_row_number", { ascending: true, nullsFirst: false });

  if (filters.batchId) query = query.eq("batch_id", filters.batchId);
  if (filters.reviewStatuses?.length) query = query.in("review_status", filters.reviewStatuses);
  if (filters.changeType) query = query.eq("change_classification", filters.changeType);
  if (filters.applyStatus) query = query.eq("apply_status", filters.applyStatus);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getGrammarSyncRow(rowId: string) {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_sync_rows")
    .select(rowSelect)
    .eq("id", rowId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function listGrammarSyncRowsByIds(rowIds: string[]) {
  const ids = [...new Set(rowIds.filter(Boolean))];
  if (ids.length === 0) return [];

  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_sync_rows")
    .select(rowSelect)
    .in("id", ids);

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function listLatestGrammarSyncRowsBySourceKeys(sourceRowKeys: string[]) {
  const keys = [...new Set(sourceRowKeys.filter(Boolean))];
  if (keys.length === 0) return [];

  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_sync_rows")
    .select(rowSelect)
    .in("source_row_key", keys)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const latest = new Map<string, GrammarSyncRow>();
  for (const row of (data ?? []).map(mapRow)) {
    if (!latest.has(row.sourceRowKey)) {
      latest.set(row.sourceRowKey, row);
    }
  }

  return [...latest.values()];
}

export async function getGrammarSyncRowCountsForBatches(batchIds: string[]) {
  const ids = [...new Set(batchIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, number>();

  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_sync_rows")
    .select("batch_id")
    .in("batch_id", ids);

  if (error) throw error;

  return (data ?? []).reduce<Map<string, number>>((result, row) => {
    result.set(row.batch_id, (result.get(row.batch_id) ?? 0) + 1);
    return result;
  }, new Map());
}
