"use server";

import { requireAdminSupabase } from "@/features/admin/shared";

import type {
  VocabSyncBatch,
  VocabSyncBatchStatus,
  VocabSyncRow,
} from "@/features/vocabulary-sync/types";

interface NewVocabSyncBatchInput {
  externalSource?: string;
  sourceDocumentId?: string | null;
  sourceSheetName?: string | null;
  sourceSheetGid?: string | null;
  rawBatchPayload?: Record<string, unknown> | null;
  notes?: string | null;
  totalRows?: number;
}

interface NewVocabSyncRowInput {
  externalSource?: string;
  externalId?: string | null;
  sourceRowKey: string;
  sourceRowNumber?: number | null;
  sourceUpdatedAt?: string | null;
  rawPayload: Record<string, unknown>;
  normalizedPayload?: Record<string, unknown>;
  contentHash?: string | null;
  changeClassification?: VocabSyncRow["changeClassification"];
  matchResult?: string | null;
  matchedWordIds?: string[];
  parseErrors?: string[];
  reviewStatus?: VocabSyncRow["reviewStatus"];
  applyStatus?: VocabSyncRow["applyStatus"];
  aiStatus?: VocabSyncRow["aiStatus"];
  sourceConfidence?: VocabSyncRow["sourceConfidence"];
  diffSummary?: Record<string, unknown> | null;
  reviewNote?: string | null;
  errorMessage?: string | null;
}

function mapBatchRow(row: {
  id: string;
  external_source: string;
  source_document_id: string | null;
  source_sheet_name: string | null;
  source_sheet_gid: string | null;
  status: VocabSyncBatchStatus;
  initiated_by: string | null;
  raw_batch_payload: Record<string, unknown> | null;
  total_rows: number;
  pending_rows: number;
  approved_rows: number;
  rejected_rows: number;
  applied_rows: number;
  error_rows: number;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}): VocabSyncBatch {
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

function mapRow(row: {
  id: string;
  batch_id: string;
  external_source: string;
  external_id: string | null;
  source_row_key: string;
  source_row_number: number | null;
  source_updated_at: string | null;
  raw_payload: Record<string, unknown>;
  normalized_payload: Record<string, unknown>;
  admin_edited_payload: Record<string, unknown> | null;
  content_hash: string | null;
  change_classification: VocabSyncRow["changeClassification"];
  match_result: string | null;
  matched_word_ids: string[];
  parse_errors: string[];
  review_status: VocabSyncRow["reviewStatus"];
  ai_status: VocabSyncRow["aiStatus"];
  source_confidence: VocabSyncRow["sourceConfidence"];
  diff_summary: Record<string, unknown> | null;
  review_note: string | null;
  apply_status: VocabSyncRow["applyStatus"];
  approved_by: string | null;
  approved_at: string | null;
  applied_word_id: string | null;
  applied_by: string | null;
  applied_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}): VocabSyncRow {
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
    matchedWordIds: row.matched_word_ids,
    parseErrors: row.parse_errors,
    reviewStatus: row.review_status,
    aiStatus: row.ai_status,
    sourceConfidence: row.source_confidence,
    diffSummary: row.diff_summary,
    reviewNote: row.review_note,
    applyStatus: row.apply_status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    appliedWordId: row.applied_word_id,
    appliedBy: row.applied_by,
    appliedAt: row.applied_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createVocabSyncBatch(input: NewVocabSyncBatchInput) {
  const { supabase, auth } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("vocab_sync_batches")
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
    .select(
      "id, external_source, source_document_id, source_sheet_name, source_sheet_gid, status, initiated_by, raw_batch_payload, total_rows, pending_rows, approved_rows, rejected_rows, applied_rows, error_rows, notes, started_at, completed_at, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapBatchRow(data);
}

export async function createVocabSyncRows(batchId: string, rows: NewVocabSyncRowInput[]) {
  if (rows.length === 0) {
    return [];
  }

  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("vocab_sync_rows")
    .insert(
      rows.map((row) => ({
        batch_id: batchId,
        external_source: row.externalSource ?? "google_sheets",
        external_id: row.externalId ?? null,
        source_row_key: row.sourceRowKey,
        source_row_number: row.sourceRowNumber ?? null,
        source_updated_at: row.sourceUpdatedAt ?? null,
        raw_payload: row.rawPayload,
        normalized_payload: row.normalizedPayload ?? {},
        content_hash: row.contentHash ?? null,
        change_classification: row.changeClassification ?? "new",
        match_result: row.matchResult ?? null,
        matched_word_ids: row.matchedWordIds ?? [],
        parse_errors: row.parseErrors ?? [],
        review_status: row.reviewStatus ?? "pending",
        apply_status: row.applyStatus ?? "pending",
        ai_status: row.aiStatus ?? "pending",
        source_confidence: row.sourceConfidence ?? null,
        diff_summary: row.diffSummary ?? null,
        review_note: row.reviewNote ?? null,
        error_message: row.errorMessage ?? null,
      })),
    )
    .select(
      "id, batch_id, external_source, external_id, source_row_key, source_row_number, source_updated_at, raw_payload, normalized_payload, admin_edited_payload, content_hash, change_classification, match_result, matched_word_ids, parse_errors, review_status, ai_status, source_confidence, diff_summary, review_note, apply_status, approved_by, approved_at, applied_word_id, applied_by, applied_at, error_message, created_at, updated_at",
    );

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRow);
}

export async function listVocabSyncBatches(limit = 20) {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("vocab_sync_batches")
    .select(
      "id, external_source, source_document_id, source_sheet_name, source_sheet_gid, status, initiated_by, raw_batch_payload, total_rows, pending_rows, approved_rows, rejected_rows, applied_rows, error_rows, notes, started_at, completed_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapBatchRow);
}

export async function listVocabSyncRows(batchId: string) {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("vocab_sync_rows")
    .select(
      "id, batch_id, external_source, external_id, source_row_key, source_row_number, source_updated_at, raw_payload, normalized_payload, admin_edited_payload, content_hash, change_classification, match_result, matched_word_ids, parse_errors, review_status, ai_status, source_confidence, diff_summary, review_note, apply_status, approved_by, approved_at, applied_word_id, applied_by, applied_at, error_message, created_at, updated_at",
    )
    .eq("batch_id", batchId)
    .order("created_at");

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRow);
}

export async function listVocabSyncRowsGlobal(
  filters: {
    batchId?: string;
    changeType?: VocabSyncRow["changeClassification"];
    reviewStatuses?: VocabSyncRow["reviewStatus"][];
    applyStatus?: VocabSyncRow["applyStatus"];
    limit?: number;
  } = {},
) {
  const { supabase } = await requireAdminSupabase();
  let query = supabase
    .from("vocab_sync_rows")
    .select(
      "id, batch_id, external_source, external_id, source_row_key, source_row_number, source_updated_at, raw_payload, normalized_payload, admin_edited_payload, content_hash, change_classification, match_result, matched_word_ids, parse_errors, review_status, ai_status, source_confidence, diff_summary, review_note, apply_status, approved_by, approved_at, applied_word_id, applied_by, applied_at, error_message, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .order("source_row_number", { ascending: true, nullsFirst: false });

  if (filters.batchId) {
    query = query.eq("batch_id", filters.batchId);
  }

  if (filters.changeType) {
    query = query.eq("change_classification", filters.changeType);
  }

  if (filters.reviewStatuses && filters.reviewStatuses.length > 0) {
    query = query.in("review_status", filters.reviewStatuses);
  }

  if (filters.applyStatus) {
    query = query.eq("apply_status", filters.applyStatus);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRow);
}

export async function getVocabSyncBatch(batchId: string) {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("vocab_sync_batches")
    .select(
      "id, external_source, source_document_id, source_sheet_name, source_sheet_gid, status, initiated_by, raw_batch_payload, total_rows, pending_rows, approved_rows, rejected_rows, applied_rows, error_rows, notes, started_at, completed_at, created_at, updated_at",
    )
    .eq("id", batchId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapBatchRow(data) : null;
}

export async function getVocabSyncRow(rowId: string) {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("vocab_sync_rows")
    .select(
      "id, batch_id, external_source, external_id, source_row_key, source_row_number, source_updated_at, raw_payload, normalized_payload, admin_edited_payload, content_hash, change_classification, match_result, matched_word_ids, parse_errors, review_status, ai_status, source_confidence, diff_summary, review_note, apply_status, approved_by, approved_at, applied_word_id, applied_by, applied_at, error_message, created_at, updated_at",
    )
    .eq("id", rowId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapRow(data) : null;
}

export async function listVocabSyncRowsForBatch(
  batchId: string,
  filters: {
    changeType?: VocabSyncRow["changeClassification"];
    reviewStatus?: VocabSyncRow["reviewStatus"];
    applyStatus?: VocabSyncRow["applyStatus"];
    limit?: number;
  } = {},
) {
  const { supabase } = await requireAdminSupabase();
  let query = supabase
    .from("vocab_sync_rows")
    .select(
      "id, batch_id, external_source, external_id, source_row_key, source_row_number, source_updated_at, raw_payload, normalized_payload, admin_edited_payload, content_hash, change_classification, match_result, matched_word_ids, parse_errors, review_status, ai_status, source_confidence, diff_summary, review_note, apply_status, approved_by, approved_at, applied_word_id, applied_by, applied_at, error_message, created_at, updated_at",
    )
    .eq("batch_id", batchId)
    .order("source_row_number", { ascending: true, nullsFirst: false });

  if (filters.changeType) {
    query = query.eq("change_classification", filters.changeType);
  }

  if (filters.reviewStatus) {
    query = query.eq("review_status", filters.reviewStatus);
  }

  if (filters.applyStatus) {
    query = query.eq("apply_status", filters.applyStatus);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRow);
}

export async function updateVocabSyncBatch(
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
    .from("vocab_sync_batches")
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
    .select(
      "id, external_source, source_document_id, source_sheet_name, source_sheet_gid, status, initiated_by, raw_batch_payload, total_rows, pending_rows, approved_rows, rejected_rows, applied_rows, error_rows, notes, started_at, completed_at, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapBatchRow(data);
}

export async function updateVocabSyncRow(
  rowId: string,
  patch: Partial<{
    adminEditedPayload: Record<string, unknown> | null;
    sourceRowKey: string;
    contentHash: string | null;
    reviewStatus: VocabSyncRow["reviewStatus"];
    applyStatus: VocabSyncRow["applyStatus"];
    aiStatus: VocabSyncRow["aiStatus"];
    sourceConfidence: VocabSyncRow["sourceConfidence"];
    reviewNote: string | null;
    approvedBy: string | null;
    approvedAt: string | null;
    appliedWordId: string | null;
    appliedBy: string | null;
    appliedAt: string | null;
    errorMessage: string | null;
  }>,
) {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("vocab_sync_rows")
    .update({
      admin_edited_payload: patch.adminEditedPayload,
      source_row_key: patch.sourceRowKey,
      content_hash: patch.contentHash,
      review_status: patch.reviewStatus,
      apply_status: patch.applyStatus,
      ai_status: patch.aiStatus,
      source_confidence: patch.sourceConfidence,
      review_note: patch.reviewNote,
      approved_by: patch.approvedBy,
      approved_at: patch.approvedAt,
      applied_word_id: patch.appliedWordId,
      applied_by: patch.appliedBy,
      applied_at: patch.appliedAt,
      error_message: patch.errorMessage,
    })
    .eq("id", rowId)
    .select(
      "id, batch_id, external_source, external_id, source_row_key, source_row_number, source_updated_at, raw_payload, normalized_payload, admin_edited_payload, content_hash, change_classification, match_result, matched_word_ids, parse_errors, review_status, ai_status, source_confidence, diff_summary, review_note, apply_status, approved_by, approved_at, applied_word_id, applied_by, applied_at, error_message, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapRow(data);
}
