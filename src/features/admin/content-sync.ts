"use server";

import { z } from "zod";

import {
  examplesToTextarea,
  optionalText,
  parseExamplesTextarea,
  requireAdminSupabase,
  revalidateAdminPaths,
  redirectTo,
} from "@/features/admin/shared";
import {
  getRecentVocabSyncPreviewBatches,
  getVocabSyncPreviewBatch,
  getVocabSyncPreviewRows,
  startVocabSyncPreview,
} from "@/features/vocabulary-sync/preview";
import { applyApprovedVocabSyncRows } from "@/features/vocabulary-sync/apply";
import { buildWordContentHash } from "@/features/vocabulary-sync/content-hash";
import { buildSourceRowKey, type NormalizedVocabSyncPayload } from "@/features/vocabulary-sync/normalize";
import {
  getVocabSyncRow,
  updateVocabSyncBatch,
  updateVocabSyncRow,
} from "@/features/vocabulary-sync/repository";
import type {
  VocabSyncBatch,
  VocabSyncRow,
  WordAiStatus,
  WordReviewStatus,
  WordSourceConfidence,
} from "@/features/vocabulary-sync/types";
import { logger } from "@/lib/logger";

const syncRowEditableSchema = z.object({
  normalizedText: z.string().trim().min(1),
  pinyin: z.string().trim().min(1),
  meaningsVi: z.string().trim().min(1),
  hanViet: z.string().trim().nullable(),
  traditionalVariant: z.string().trim().nullable(),
  mainRadicals: z.array(z.string().trim().min(1)),
  radicalSummary: z.string().trim().nullable(),
  hskLevel: z.number().int().min(1).max(9).nullable(),
  partOfSpeech: z.string().trim().nullable(),
  topicTags: z.array(z.string().trim().min(1)),
  examples: z.array(
    z.object({
      chineseText: z.string().trim().min(1),
      pinyin: z.string().trim().nullable(),
      vietnameseMeaning: z.string().trim().min(1),
      sortOrder: z.number().int().positive(),
    }),
  ),
  similarChars: z.array(z.string().trim().min(1)),
  characterStructureType: z.string().trim().nullable(),
  structureExplanation: z.string().trim().nullable(),
  mnemonic: z.string().trim().nullable(),
  notes: z.string().trim().nullable(),
  sourceConfidence: z.enum(["low", "medium", "high"]).nullable(),
  ambiguityFlag: z.boolean(),
  ambiguityNote: z.string().trim().nullable(),
  readingCandidates: z.string().trim().nullable(),
  reviewStatus: z.enum(["pending", "needs_review", "approved", "rejected", "applied"]),
  aiStatus: z.enum(["pending", "processing", "done", "failed", "skipped"]),
  sourceUpdatedAt: z.string().trim().nullable(),
});

export interface ContentSyncFilters {
  batchId: string | null;
  q: string;
  changeType: VocabSyncRow["changeClassification"] | "all";
  reviewStatus: WordReviewStatus | "all";
  applyStatus: VocabSyncRow["applyStatus"] | "all";
  selectedRowId: string | null;
}

export interface ContentSyncSummary {
  new: number;
  changed: number;
  unchanged: number;
  conflict: number;
  invalid: number;
  approved: number;
  applied: number;
  rejected: number;
}

export interface ContentSyncPageData {
  batches: VocabSyncBatch[];
  selectedBatch: VocabSyncBatch | null;
  filteredRows: VocabSyncRow[];
  selectedRow: VocabSyncRow | null;
  summary: ContentSyncSummary | null;
  filters: ContentSyncFilters;
}

function splitPipeDelimited(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseBooleanValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function normalizeOptionalText(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildEditedRowIdentity(payload: NormalizedVocabSyncPayload) {
  return {
    sourceRowKey: buildSourceRowKey({
      externalId: payload.externalId,
      normalizedText: payload.normalizedText,
      pinyin: payload.pinyin,
      partOfSpeech: payload.partOfSpeech,
    }),
    contentHash: buildWordContentHash({
      normalizedText: payload.normalizedText ?? "",
      pinyin: payload.pinyin,
      meaningsVi: payload.meaningsVi,
      hanViet: payload.hanViet,
      traditionalVariant: payload.traditionalVariant,
      hskLevel: payload.hskLevel,
      partOfSpeech: payload.partOfSpeech,
      componentBreakdownJson: payload.componentBreakdownJson,
      radicalSummary: payload.radicalSummary,
      mnemonic: payload.mnemonic,
      characterStructureType: payload.characterStructureType,
      structureExplanation: payload.structureExplanation,
      notes: payload.notes,
      ambiguityFlag: payload.ambiguityFlag,
      ambiguityNote: payload.ambiguityNote,
      readingCandidates: payload.readingCandidates,
      mainRadicals: payload.mainRadicals,
      topicTags: payload.topicTags,
      examples: payload.examples,
    }),
  };
}

function buildContentSyncPath(filters: {
  batchId?: string | null;
  q?: string | null;
  changeType?: string | null;
  reviewStatus?: string | null;
  applyStatus?: string | null;
  selectedRowId?: string | null;
}) {
  const params = new URLSearchParams();

  if (filters.batchId) params.set("batch", filters.batchId);
  if (filters.q) params.set("q", filters.q);
  if (filters.changeType && filters.changeType !== "all") params.set("changeType", filters.changeType);
  if (filters.reviewStatus && filters.reviewStatus !== "all") params.set("reviewStatus", filters.reviewStatus);
  if (filters.applyStatus && filters.applyStatus !== "all") params.set("applyStatus", filters.applyStatus);
  if (filters.selectedRowId) params.set("row", filters.selectedRowId);

  const query = params.toString();
  return query ? `/admin/content-sync?${query}` : "/admin/content-sync";
}

function getEditablePayload(row: VocabSyncRow) {
  return (row.adminEditedPayload ?? row.normalizedPayload) as Record<string, unknown>;
}

export function getEditablePayloadForForm(row: VocabSyncRow) {
  const payload = getEditablePayload(row);
  const examples = Array.isArray(payload.examples)
    ? payload.examples
        .map((example, index) => {
          const entry = example as Record<string, unknown>;
          return {
            chineseText: String(entry.chineseText ?? ""),
            pinyin: typeof entry.pinyin === "string" ? entry.pinyin : null,
            vietnameseMeaning: String(entry.vietnameseMeaning ?? ""),
            sortOrder:
              typeof entry.sortOrder === "number" && Number.isFinite(entry.sortOrder)
                ? entry.sortOrder
                : index + 1,
          };
        })
    : [];

  return {
    normalizedText: typeof payload.normalizedText === "string" ? payload.normalizedText : "",
    pinyin: typeof payload.pinyin === "string" ? payload.pinyin : "",
    meaningsVi: typeof payload.meaningsVi === "string" ? payload.meaningsVi : "",
    hanViet: typeof payload.hanViet === "string" ? payload.hanViet : "",
    traditionalVariant:
      typeof payload.traditionalVariant === "string" ? payload.traditionalVariant : "",
    mainRadicals: Array.isArray(payload.mainRadicals) ? payload.mainRadicals.join(" | ") : "",
    radicalSummary: typeof payload.radicalSummary === "string" ? payload.radicalSummary : "",
    hskLevel:
      typeof payload.hskLevel === "number" && Number.isFinite(payload.hskLevel)
        ? String(payload.hskLevel)
        : "",
    partOfSpeech: typeof payload.partOfSpeech === "string" ? payload.partOfSpeech : "",
    topicTags: Array.isArray(payload.topicTags) ? payload.topicTags.join(" | ") : "",
    examplesText: examplesToTextarea(examples),
    similarChars: Array.isArray(payload.similarChars) ? payload.similarChars.join(" | ") : "",
    characterStructureType:
      typeof payload.characterStructureType === "string" ? payload.characterStructureType : "",
    structureExplanation:
      typeof payload.structureExplanation === "string" ? payload.structureExplanation : "",
    mnemonic: typeof payload.mnemonic === "string" ? payload.mnemonic : "",
    notes: typeof payload.notes === "string" ? payload.notes : "",
    sourceConfidence:
      payload.sourceConfidence === "low" ||
      payload.sourceConfidence === "medium" ||
      payload.sourceConfidence === "high"
        ? payload.sourceConfidence
        : "",
    ambiguityFlag: payload.ambiguityFlag === true,
    ambiguityNote: typeof payload.ambiguityNote === "string" ? payload.ambiguityNote : "",
    readingCandidates: typeof payload.readingCandidates === "string" ? payload.readingCandidates : "",
    reviewStatus:
      payload.reviewStatus === "pending" ||
      payload.reviewStatus === "needs_review" ||
      payload.reviewStatus === "approved" ||
      payload.reviewStatus === "rejected" ||
      payload.reviewStatus === "applied"
        ? payload.reviewStatus
        : row.reviewStatus,
    aiStatus:
      payload.aiStatus === "pending" ||
      payload.aiStatus === "processing" ||
      payload.aiStatus === "done" ||
      payload.aiStatus === "failed" ||
      payload.aiStatus === "skipped"
        ? payload.aiStatus
        : row.aiStatus,
    sourceUpdatedAt: typeof payload.sourceUpdatedAt === "string" ? payload.sourceUpdatedAt : "",
    reviewNote: row.reviewNote ?? "",
  };
}

function parseSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function parseContentSyncFilters(searchParams: Record<string, string | string[] | undefined>): ContentSyncFilters {
  const changeType = parseSearchParam(searchParams.changeType);
  const reviewStatus = parseSearchParam(searchParams.reviewStatus);
  const applyStatus = parseSearchParam(searchParams.applyStatus);

  return {
    batchId: parseSearchParam(searchParams.batch) || null,
    q: parseSearchParam(searchParams.q).trim(),
    changeType:
      changeType === "new" ||
      changeType === "changed" ||
      changeType === "unchanged" ||
      changeType === "conflict" ||
      changeType === "invalid"
        ? changeType
        : "all",
    reviewStatus:
      reviewStatus === "pending" ||
      reviewStatus === "needs_review" ||
      reviewStatus === "approved" ||
      reviewStatus === "rejected" ||
      reviewStatus === "applied"
        ? reviewStatus
        : "all",
    applyStatus:
      applyStatus === "pending" ||
      applyStatus === "applied" ||
      applyStatus === "failed" ||
      applyStatus === "skipped"
        ? applyStatus
        : "all",
    selectedRowId: parseSearchParam(searchParams.row) || null,
  };
}

function filterSyncRows(rows: VocabSyncRow[], filters: ContentSyncFilters) {
  const needle = filters.q.toLowerCase();

  return rows.filter((row) => {
    if (filters.changeType !== "all" && row.changeClassification !== filters.changeType) {
      return false;
    }

    if (filters.reviewStatus !== "all" && row.reviewStatus !== filters.reviewStatus) {
      return false;
    }

    if (filters.applyStatus !== "all" && row.applyStatus !== filters.applyStatus) {
      return false;
    }

    if (!needle) {
      return true;
    }

    const payload = getEditablePayload(row);
    const normalizedText = typeof payload.normalizedText === "string" ? payload.normalizedText : "";
    const pinyin = typeof payload.pinyin === "string" ? payload.pinyin : "";
    const haystacks = [
      normalizedText,
      pinyin,
      row.sourceRowKey,
      row.externalId ?? "",
      row.reviewNote ?? "",
      row.errorMessage ?? "",
    ];

    return haystacks.some((value) => value.toLowerCase().includes(needle));
  });
}

function summarizeRows(rows: VocabSyncRow[]): ContentSyncSummary {
  return rows.reduce<ContentSyncSummary>(
    (summary, row) => {
      summary[row.changeClassification] += 1;

      if (row.reviewStatus === "approved") {
        summary.approved += 1;
      }

      if (
        row.reviewStatus === "applied" ||
        row.applyStatus === "applied" ||
        row.applyStatus === "skipped"
      ) {
        summary.applied += 1;
      }

      if (row.reviewStatus === "rejected") {
        summary.rejected += 1;
      }

      return summary;
    },
    {
      new: 0,
      changed: 0,
      unchanged: 0,
      conflict: 0,
      invalid: 0,
      approved: 0,
      applied: 0,
      rejected: 0,
    },
  );
}

async function refreshBatchReviewCounts(batchId: string) {
  const rows = await getVocabSyncPreviewRows(batchId);
  const summary = summarizeRows(rows);
  const approvedRows = rows.filter(
    (row) => row.reviewStatus === "approved" && row.applyStatus !== "applied" && row.applyStatus !== "skipped",
  ).length;
  const rejectedRows = rows.filter((row) => row.reviewStatus === "rejected").length;
  const appliedRows = rows.filter(
    (row) =>
      row.reviewStatus === "applied" || row.applyStatus === "applied" || row.applyStatus === "skipped",
  ).length;
  const pendingRows = rows.filter(
    (row) =>
      row.reviewStatus === "pending" ||
      row.reviewStatus === "needs_review" ||
      row.applyStatus === "failed" ||
      (row.reviewStatus === "approved" && row.applyStatus === "pending"),
  ).length;
  const errorRows = summary.invalid + summary.conflict;

  await updateVocabSyncBatch(batchId, {
    pendingRows,
    approvedRows,
    rejectedRows,
    appliedRows,
    errorRows,
  });
}

async function buildAdminEditedPayload(formData: FormData, fallbackRow: VocabSyncRow) {
  const basePayload = getEditablePayload(fallbackRow);
  const parsed = syncRowEditableSchema.parse({
    normalizedText: String(formData.get("normalized_text") ?? "").trim(),
    pinyin: String(formData.get("pinyin") ?? "").trim(),
    meaningsVi: String(formData.get("meanings_vi") ?? "").trim(),
    hanViet: normalizeOptionalText(optionalText(formData.get("han_viet"))),
    traditionalVariant: normalizeOptionalText(optionalText(formData.get("traditional_variant"))),
    mainRadicals: splitPipeDelimited(optionalText(formData.get("main_radicals"))),
    radicalSummary: normalizeOptionalText(optionalText(formData.get("radical_summary"))),
    hskLevel: optionalText(formData.get("hsk_level"))
      ? Number(optionalText(formData.get("hsk_level")))
      : null,
    partOfSpeech: normalizeOptionalText(optionalText(formData.get("part_of_speech"))),
    topicTags: splitPipeDelimited(optionalText(formData.get("topic_tags"))),
    examples: parseExamplesTextarea(formData.get("examples_text")),
    similarChars: splitPipeDelimited(optionalText(formData.get("similar_chars"))),
    characterStructureType:
      normalizeOptionalText(optionalText(formData.get("character_structure_type"))),
    structureExplanation:
      normalizeOptionalText(optionalText(formData.get("structure_explanation"))),
    mnemonic: normalizeOptionalText(optionalText(formData.get("mnemonic"))),
    notes: normalizeOptionalText(optionalText(formData.get("notes"))),
    sourceConfidence: (optionalText(formData.get("source_confidence")) as WordSourceConfidence | null) ?? null,
    ambiguityFlag: parseBooleanValue(formData.get("ambiguity_flag")),
    ambiguityNote: normalizeOptionalText(optionalText(formData.get("ambiguity_note"))),
    readingCandidates: normalizeOptionalText(optionalText(formData.get("reading_candidates"))),
    reviewStatus: (optionalText(formData.get("review_status")) as WordReviewStatus | null) ?? fallbackRow.reviewStatus,
    aiStatus: (optionalText(formData.get("ai_status")) as WordAiStatus | null) ?? fallbackRow.aiStatus,
    sourceUpdatedAt: normalizeOptionalText(optionalText(formData.get("source_updated_at"))),
  });

  return {
    externalId:
      typeof basePayload.externalId === "string" && basePayload.externalId.trim().length > 0
        ? basePayload.externalId
        : null,
    inputText:
      typeof basePayload.inputText === "string" && basePayload.inputText.trim().length > 0
        ? basePayload.inputText
        : null,
    componentBreakdownJson: basePayload.componentBreakdownJson ?? null,
    ...parsed,
  };
}

function redirectBackFromFormData(formData: FormData, overrides: { selectedRowId?: string | null } = {}) {
  const batchId = optionalText(formData.get("batch_id"));
  const q = optionalText(formData.get("return_q"));
  const changeType = optionalText(formData.get("return_change_type"));
  const reviewStatus = optionalText(formData.get("return_review_status"));
  const applyStatus = optionalText(formData.get("return_apply_status"));
  const selectedRowId = overrides.selectedRowId ?? optionalText(formData.get("return_row_id"));

  redirectTo(
    buildContentSyncPath({
      batchId,
      q,
      changeType,
      reviewStatus,
      applyStatus,
      selectedRowId,
    }),
  );
}

function getSelectedRowIds(formData: FormData) {
  return formData
    .getAll("selected_row_ids")
    .map((value) => String(value))
    .filter(Boolean);
}

export async function getContentSyncPageData(filters: ContentSyncFilters): Promise<ContentSyncPageData> {
  const batches = await getRecentVocabSyncPreviewBatches(20);
  const fallbackBatchId = filters.batchId ?? batches[0]?.id ?? null;
  const selectedBatch = fallbackBatchId ? await getVocabSyncPreviewBatch(fallbackBatchId) : null;

  if (!selectedBatch) {
    return {
      batches,
      selectedBatch: null,
      filteredRows: [],
      selectedRow: null,
      summary: null,
      filters: {
        ...filters,
        batchId: null,
        applyStatus: filters.applyStatus,
        selectedRowId: null,
      },
    };
  }

  const allRows = await getVocabSyncPreviewRows(selectedBatch.id);
  const filteredRows = filterSyncRows(allRows, {
    ...filters,
    batchId: selectedBatch.id,
  });
  const selectedRow =
    filteredRows.find((row) => row.id === filters.selectedRowId) ??
    allRows.find((row) => row.id === filters.selectedRowId) ??
    filteredRows[0] ??
    null;

  return {
    batches,
    selectedBatch,
    filteredRows,
    selectedRow,
    summary: summarizeRows(allRows),
    filters: {
      ...filters,
      batchId: selectedBatch.id,
      selectedRowId: selectedRow?.id ?? null,
    },
  };
}

export async function startContentSyncPreviewAction(formData: FormData) {
  const spreadsheetId = optionalText(formData.get("spreadsheet_id"));
  const sheetName = optionalText(formData.get("sheet_name"));

  if (!sheetName) {
    throw new Error("Sheet name is required.");
  }

  const result = await startVocabSyncPreview({
    spreadsheetId: spreadsheetId ?? undefined,
    sheetName,
  });

  revalidateAdminPaths(["/admin", "/admin/content-sync"]);
  redirectTo(buildContentSyncPath({ batchId: result.batch.id }));
}

export async function retryContentSyncPreviewBatchAction(formData: FormData) {
  const batchId = optionalText(formData.get("batch_id"));

  if (!batchId) {
    throw new Error("Batch id is required.");
  }

  const batch = await getVocabSyncPreviewBatch(batchId);
  if (!batch?.sourceSheetName) {
    throw new Error("The selected batch does not have enough source metadata to retry preview.");
  }

  const result = await startVocabSyncPreview({
    spreadsheetId: batch.sourceDocumentId ?? undefined,
    sheetName: batch.sourceSheetName,
  });

  revalidateAdminPaths(["/admin", "/admin/content-sync"]);
  redirectTo(buildContentSyncPath({ batchId: result.batch.id }));
}

export async function saveContentSyncRowEditsAction(formData: FormData) {
  const rowId = optionalText(formData.get("row_id"));

  if (!rowId) {
    throw new Error("Row id is required.");
  }

  const row = await getVocabSyncRow(rowId);
  if (!row) {
    throw new Error("Sync row not found.");
  }

  const adminEditedPayload = await buildAdminEditedPayload(formData, row);
  const identity = buildEditedRowIdentity(adminEditedPayload);
  const reviewNote = normalizeOptionalText(optionalText(formData.get("review_note")));

  await updateVocabSyncRow(rowId, {
    adminEditedPayload: adminEditedPayload as unknown as Record<string, unknown>,
    sourceRowKey: identity.sourceRowKey,
    contentHash: identity.contentHash,
    reviewNote,
  });

  await refreshBatchReviewCounts(row.batchId);
  revalidateAdminPaths(["/admin/content-sync"]);
  redirectBackFromFormData(formData, { selectedRowId: rowId });
}

export async function reviewContentSyncRowAction(formData: FormData) {
  const rowId = optionalText(formData.get("row_id"));
  const decision = optionalText(formData.get("decision"));

  if (!rowId || !decision) {
    throw new Error("Row id and decision are required.");
  }

  const row = await getVocabSyncRow(rowId);
  if (!row) {
    throw new Error("Sync row not found.");
  }

  if (row.reviewStatus === "applied" || row.applyStatus === "applied" || row.applyStatus === "skipped") {
    throw new Error("Resolved sync rows cannot be reviewed again.");
  }

  const adminEditedPayload = await buildAdminEditedPayload(formData, row);
  const identity = buildEditedRowIdentity(adminEditedPayload);
  const reviewNote = normalizeOptionalText(optionalText(formData.get("review_note")));
  const { auth } = await requireAdminSupabase();

  await updateVocabSyncRow(rowId, {
    adminEditedPayload: adminEditedPayload as unknown as Record<string, unknown>,
    sourceRowKey: identity.sourceRowKey,
    contentHash: identity.contentHash,
    reviewStatus: decision === "approve" ? "approved" : "rejected",
    reviewNote,
    approvedBy: decision === "approve" ? auth.user?.id ?? null : null,
    approvedAt: decision === "approve" ? new Date().toISOString() : null,
  });

  await refreshBatchReviewCounts(row.batchId);
  revalidateAdminPaths(["/admin/content-sync"]);
  redirectBackFromFormData(formData, { selectedRowId: rowId });
}

export async function bulkReviewContentSyncRowsAction(formData: FormData) {
  const decision = optionalText(formData.get("decision"));
  const batchId = optionalText(formData.get("batch_id"));
  const selectedRowIds = getSelectedRowIds(formData);

  if (!decision || !batchId) {
    throw new Error("Bulk review request is missing context.");
  }

  if (selectedRowIds.length === 0) {
    redirectBackFromFormData(formData);
  }

  const rows = await getVocabSyncPreviewRows(batchId);
  const selectedRowSet = new Set(selectedRowIds);
  const eligibleIds = rows
    .filter(
      (row) =>
        selectedRowSet.has(row.id) &&
        row.applyStatus === "pending" &&
        row.reviewStatus !== "applied",
    )
    .map((row) => row.id);

  if (eligibleIds.length === 0) {
    redirectBackFromFormData(formData);
  }

  const { auth, supabase } = await requireAdminSupabase();
  const reviewStatus = decision === "approve" ? "approved" : "rejected";
  const approvedBy = decision === "approve" ? auth.user?.id ?? null : null;
  const approvedAt = decision === "approve" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("vocab_sync_rows")
    .update({
      review_status: reviewStatus,
      approved_by: approvedBy,
      approved_at: approvedAt,
    })
    .in("id", eligibleIds)
    .eq("batch_id", batchId);

  if (error) {
    throw error;
  }

  logger.info("admin_content_sync_bulk_reviewed", {
    batchId,
    decision,
    rowCount: eligibleIds.length,
    userId: auth.user?.id ?? null,
  });

  await refreshBatchReviewCounts(batchId);
  revalidateAdminPaths(["/admin/content-sync"]);
  redirectBackFromFormData(formData);
}

export async function approveAllEligibleContentSyncRowsAction(formData: FormData) {
  const batchId = optionalText(formData.get("batch_id"));

  if (!batchId) {
    throw new Error("Batch id is required.");
  }

  const rows = await getVocabSyncPreviewRows(batchId);
  const eligibleIds = rows
    .filter(
      (row) =>
        row.applyStatus === "pending" &&
        row.reviewStatus !== "approved" &&
        row.reviewStatus !== "applied" &&
        row.changeClassification !== "invalid" &&
        row.changeClassification !== "conflict",
    )
    .map((row) => row.id);

  if (eligibleIds.length === 0) {
    redirectBackFromFormData(formData);
  }

  const { auth, supabase } = await requireAdminSupabase();
  const approvedAt = new Date().toISOString();
  const { error } = await supabase
    .from("vocab_sync_rows")
    .update({
      review_status: "approved",
      approved_by: auth.user?.id ?? null,
      approved_at: approvedAt,
    })
    .in("id", eligibleIds)
    .eq("batch_id", batchId);

  if (error) {
    throw error;
  }

  logger.info("admin_content_sync_approved_all_eligible", {
    batchId,
    rowCount: eligibleIds.length,
    userId: auth.user?.id ?? null,
  });

  await refreshBatchReviewCounts(batchId);
  revalidateAdminPaths(["/admin/content-sync"]);
  redirectBackFromFormData(formData);
}

export async function applyContentSyncRowAction(formData: FormData) {
  const rowId = optionalText(formData.get("row_id"));

  if (!rowId) {
    throw new Error("Row id is required.");
  }

  const row = await getVocabSyncRow(rowId);
  if (!row) {
    throw new Error("Sync row not found.");
  }

  await applyApprovedVocabSyncRows({
    rowIds: [rowId],
  });

  await refreshBatchReviewCounts(row.batchId);
  revalidateAdminPaths(["/admin", "/admin/content-sync", "/admin/words", "/vocabulary", "/lessons"]);
  redirectBackFromFormData(formData, { selectedRowId: rowId });
}

export async function bulkApplyApprovedContentSyncRowsAction(formData: FormData) {
  const batchId = optionalText(formData.get("batch_id"));
  const selectedRowIds = getSelectedRowIds(formData);

  if (!batchId) {
    throw new Error("Batch id is required.");
  }

  if (selectedRowIds.length === 0) {
    redirectBackFromFormData(formData);
  }

  await applyApprovedVocabSyncRows({
    batchId,
    rowIds: selectedRowIds,
  });

  await refreshBatchReviewCounts(batchId);
  revalidateAdminPaths(["/admin", "/admin/content-sync", "/admin/words", "/vocabulary", "/lessons"]);
  redirectBackFromFormData(formData);
}

export async function applyAllApprovedContentSyncRowsAction(formData: FormData) {
  const batchId = optionalText(formData.get("batch_id"));

  if (!batchId) {
    throw new Error("Batch id is required.");
  }

  await applyApprovedVocabSyncRows({
    batchId,
  });

  await refreshBatchReviewCounts(batchId);
  revalidateAdminPaths(["/admin", "/admin/content-sync", "/admin/words", "/vocabulary", "/lessons"]);
  redirectBackFromFormData(formData);
}
