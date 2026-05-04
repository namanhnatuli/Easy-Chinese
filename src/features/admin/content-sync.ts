"use server";

import { z } from "zod";

import {
  optionalText,
} from "@/features/admin/shared-utils";
import {
  requireAdminSupabase,
  revalidateAdminPaths,
  redirectTo,
} from "@/features/admin/shared";
import {
  getGlobalVocabSyncPreviewRows,
  getRecentVocabSyncPreviewBatches,
  getVocabSyncPreviewBatch,
  getVocabSyncPreviewRows,
  startVocabSyncPreview,
} from "@/features/vocabulary-sync/preview";
import { applyApprovedVocabSyncRows } from "@/features/vocabulary-sync/apply";
import {
  buildSenseContentHashForApply,
  buildSenseSourceKeyForApply,
} from "@/features/vocabulary-sync/apply-senses";
import { buildWordContentHash } from "@/features/vocabulary-sync/content-hash";
import { buildSourceRowKey } from "@/features/vocabulary-sync/normalize";
import {
  getVocabSyncRow,
  updateVocabSyncBatch,
  updateVocabSyncRow,
} from "@/features/vocabulary-sync/repository";
import type {
  NormalizedSense,
  NormalizedSenseExample,
  NormalizedVocabSyncPayload,
  VocabSyncRow,
  WordAiStatus,
  WordReviewStatus,
  WordSourceConfidence,
} from "@/features/vocabulary-sync/types";
import { parseAdminSensesJson } from "@/features/admin/word-senses";
import { logger } from "@/lib/logger";
import {
  ContentSyncFilters,
  ContentSyncPageData,
  buildContentSyncPath,
  filterSyncRows,
  getEditablePayload,
  normalizeOptionalText,
  parseBooleanValue,
  splitPipeDelimited,
  summarizeRows,
} from "./content-sync-utils";

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
      componentBreakdownJson: payload.componentBreakdownJson as any,
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
      examples: payload.examples as any,
    }),
  };
}

function dedupePreserveOrder(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function flattenSenseExamples(senses: NormalizedSense[]): NormalizedVocabSyncPayload["examples"] {
  let sortOrder = 1;
  return senses.flatMap((sense) =>
    sense.examples.map((example) => ({
      chineseText: example.cn,
      pinyin: example.py,
      vietnameseMeaning: example.vi,
      sortOrder: sortOrder++,
    })),
  );
}

function deriveSenseSummaries(senses: NormalizedSense[]) {
  const primarySense = senses.find((sense) => sense.isPrimary) ?? senses[0] ?? null;

  return {
    pinyin: primarySense?.pinyin ?? null,
    meaningsVi: dedupePreserveOrder(senses.map((sense) => sense.meaningVi)).join(" | ") || null,
    partOfSpeech:
      dedupePreserveOrder(
        senses.map((sense) => sense.partOfSpeech).filter((value): value is string => Boolean(value)),
      ).join(" | ") || null,
    readingCandidates:
      dedupePreserveOrder(senses.map((sense) => `${sense.pinyin}=${sense.meaningVi}`)).join(" || ") || null,
    examples: flattenSenseExamples(senses),
  };
}

function normalizeAdminEditedSenses(formData: FormData): NormalizedSense[] {
  const editedSenses = parseAdminSensesJson(optionalText(formData.get("senses_json")));

  return editedSenses.map((sense) => ({
    pinyin: sense.pinyin,
    partOfSpeech: sense.partOfSpeech,
    meaningVi: sense.meaningVi,
    usageNote: sense.usageNote,
    senseOrder: sense.senseOrder,
    isPrimary: sense.isPrimary,
    examples: sense.examples.map(
      (example): NormalizedSenseExample => ({
        cn: example.chineseText,
        py: example.pinyin || null,
        vi: example.vietnameseMeaning,
      }),
    ),
    validationWarnings: [],
  }));
}

function buildSenseIdentity(input: {
  normalizedText: string | null;
  senses: NormalizedSense[];
}) {
  return {
    senseSourceKeys: input.senses.map((sense) =>
      buildSenseSourceKeyForApply({
        normalizedText: input.normalizedText,
        pinyin: sense.pinyin,
        partOfSpeech: sense.partOfSpeech,
      }),
    ),
    senseContentHashes: input.senses.map((sense) => buildSenseContentHashForApply(sense)),
  };
}

const syncRowEditableSchema = z.object({
  normalizedText: z.string().trim().min(1),
  hanViet: z.string().trim().nullable(),
  traditionalVariant: z.string().trim().nullable(),
  mainRadicals: z.array(z.string().trim().min(1)),
  radicalSummary: z.string().trim().nullable(),
  hskLevel: z.number().int().min(1).max(9).nullable(),
  topicTags: z.array(z.string().trim().min(1)),
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

function redirectBackFromFormData(formData: FormData, overrides: { selectedRowId?: string | null } = {}) {
  const batchId = optionalText(formData.get("batch_id"));
  const view = optionalText(formData.get("return_view"));
  const q = optionalText(formData.get("return_q"));
  const changeType = optionalText(formData.get("return_change_type"));
  const reviewStatus = optionalText(formData.get("return_review_status"));
  const applyStatus = optionalText(formData.get("return_apply_status"));
  const selectedRowId = overrides.selectedRowId ?? optionalText(formData.get("return_row_id"));
  const pageText = optionalText(formData.get("return_page"));
  const pageSizeText = optionalText(formData.get("return_page_size"));
  
  const page = pageText ? parseInt(pageText, 10) : undefined;
  const pageSize = pageSizeText ? parseInt(pageSizeText, 10) : undefined;

  redirectTo(
    buildContentSyncPath({
      batchId,
      view,
      q,
      changeType,
      reviewStatus,
      applyStatus,
      selectedRowId,
      page: !isNaN(page as any) ? page : undefined,
      pageSize: !isNaN(pageSize as any) ? pageSize : undefined,
    }),
  );
}

function getSelectedRowIds(formData: FormData) {
  return formData
    .getAll("selected_row_ids")
    .map((value) => String(value))
    .filter(Boolean);
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

async function refreshBatchesReviewCounts(batchIds: string[]) {
  const uniqueBatchIds = Array.from(new Set(batchIds)).filter(Boolean);
  for (const batchId of uniqueBatchIds) {
    await refreshBatchReviewCounts(batchId);
  }
}

async function buildAdminEditedPayload(formData: FormData, fallbackRow: VocabSyncRow): Promise<NormalizedVocabSyncPayload> {
  try {
    const basePayload = getEditablePayload(fallbackRow);
    const normalizedText = String(formData.get("normalized_text") ?? "").trim();
    const editedSenses = normalizeAdminEditedSenses(formData);
    const senseSummaries = deriveSenseSummaries(editedSenses);
    const senseIdentity = buildSenseIdentity({
      normalizedText,
      senses: editedSenses,
    });

    const parsed = syncRowEditableSchema.parse({
      normalizedText,
      hanViet: normalizeOptionalText(optionalText(formData.get("han_viet"))),
      traditionalVariant: normalizeOptionalText(optionalText(formData.get("traditional_variant"))),
      mainRadicals: splitPipeDelimited(optionalText(formData.get("main_radicals"))),
      radicalSummary: normalizeOptionalText(optionalText(formData.get("radical_summary"))),
      hskLevel: optionalText(formData.get("hsk_level"))
        ? Number(optionalText(formData.get("hsk_level")))
        : null,
      topicTags: splitPipeDelimited(optionalText(formData.get("topic_tags"))),
      similarChars: splitPipeDelimited(optionalText(formData.get("similar_chars"))),
      characterStructureType:
        normalizeOptionalText(optionalText(formData.get("character_structure_type"))),
      structureExplanation:
        normalizeOptionalText(optionalText(formData.get("structure_explanation"))),
      mnemonic: normalizeOptionalText(optionalText(formData.get("mnemonic"))),
      notes: normalizeOptionalText(optionalText(formData.get("notes"))),
      sourceConfidence:
        (optionalText(formData.get("source_confidence")) as WordSourceConfidence | null) ??
        (typeof basePayload.sourceConfidence === "string" ? (basePayload.sourceConfidence as WordSourceConfidence) : null),
      ambiguityFlag: parseBooleanValue(formData.get("ambiguity_flag")),
      ambiguityNote: normalizeOptionalText(optionalText(formData.get("ambiguity_note"))),
      readingCandidates: normalizeOptionalText(optionalText(formData.get("reading_candidates"))),
      reviewStatus: (optionalText(formData.get("review_status")) as WordReviewStatus | null) ?? fallbackRow.reviewStatus,
      aiStatus: (optionalText(formData.get("ai_status")) as WordAiStatus | null) ?? fallbackRow.aiStatus,
      sourceUpdatedAt:
        normalizeOptionalText(optionalText(formData.get("source_updated_at"))) ??
        (typeof basePayload.sourceUpdatedAt === "string" ? basePayload.sourceUpdatedAt : fallbackRow.sourceUpdatedAt),
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
      senses: editedSenses,
      senseSourceKeys: senseIdentity.senseSourceKeys,
      senseContentHashes: senseIdentity.senseContentHashes,
      senseSourceMode: "senses_json",
      validationWarnings: [],
      ...parsed,
      pinyin: senseSummaries.pinyin,
      meaningsVi: senseSummaries.meaningsVi,
      partOfSpeech: senseSummaries.partOfSpeech,
      readingCandidates: senseSummaries.readingCandidates,
      examples: senseSummaries.examples,
    };
  } catch (error) {
    logger.error("admin_content_sync_payload_build_failed", {
      rowId: fallbackRow.id,
      error: error instanceof Error ? error.message : String(error),
      zodError: error instanceof z.ZodError ? error.errors : undefined,
    });
    throw error;
  }
}

export async function getContentSyncPageData(filters: ContentSyncFilters): Promise<ContentSyncPageData> {
  const batches = await getRecentVocabSyncPreviewBatches(20);
  const selectedBatch = filters.batchId ? await getVocabSyncPreviewBatch(filters.batchId) : null;

  if (!selectedBatch && filters.batchId) {
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

  const allRows = selectedBatch
    ? await getVocabSyncPreviewRows(selectedBatch.id)
    : filters.view === "queue"
      ? await getGlobalVocabSyncPreviewRows({
          reviewStatuses: ["pending", "needs_review"],
        })
      : await getGlobalVocabSyncPreviewRows({
          reviewStatuses: ["approved", "rejected", "applied"],
        });
  const filteredRows = filterSyncRows(allRows, {
    ...filters,
    batchId: selectedBatch?.id ?? null,
  });
  const selectedRow = filters.selectedRowId
    ? filteredRows.find((row) => row.id === filters.selectedRowId) ??
      allRows.find((row) => row.id === filters.selectedRowId) ??
      null
    : null;

  return {
    batches,
    selectedBatch,
    filteredRows,
    selectedRow,
    summary: allRows.length > 0 ? summarizeRows(allRows) : null,
    filters: {
      ...filters,
      batchId: selectedBatch?.id ?? null,
      selectedRowId: selectedRow?.id ?? null,
    },
  };
}

export async function startContentSyncPreviewAction(formData: FormData) {
  const spreadsheetId = optionalText(formData.get("spreadsheet_id"));
  const sheetName = optionalText(formData.get("sheet_name"));
  const syncFromRowRaw = optionalText(formData.get("sync_from_row"));
  const syncToRowRaw = optionalText(formData.get("sync_to_row"));

  const syncFromRow = syncFromRowRaw ? parseInt(syncFromRowRaw, 10) : undefined;
  const syncToRow = syncToRowRaw ? parseInt(syncToRowRaw, 10) : undefined;

  let result;
  try {
    result = await startVocabSyncPreview({
      spreadsheetId: spreadsheetId ?? undefined,
      sheetName: sheetName ?? undefined,
      syncFromRow: isNaN(syncFromRow as number) ? undefined : syncFromRow,
      syncToRow: isNaN(syncToRow as number) ? undefined : syncToRow,
    });

    revalidateAdminPaths(["/admin", "/admin/content-sync"]);
  } catch (error) {
    logger.error("admin_content_sync_preview_failed", error, {
      spreadsheetId,
      sheetName,
    });

    redirectTo(
      buildContentSyncPath({
        error: error instanceof Error ? error.message : "Failed to start sync preview.",
      }),
    );
  }

  if (result) {
    redirectTo(buildContentSyncPath({}));
  }
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

  let result;
  try {
    result = await startVocabSyncPreview({
      spreadsheetId: batch.sourceDocumentId ?? undefined,
      sheetName: batch.sourceSheetName ?? undefined,
    });

    revalidateAdminPaths(["/admin", "/admin/content-sync"]);
  } catch (error) {
    logger.error("admin_content_sync_retry_failed", {
      batchId,
      error: error instanceof Error ? error.message : String(error),
    });

    redirectTo(
      buildContentSyncPath({
        batchId,
        error: error instanceof Error ? error.message : "Failed to retry sync preview.",
      }),
    );
  }

  if (result) {
    redirectTo(buildContentSyncPath({ batchId: result.batch.id }));
  }
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

  try {
    await updateVocabSyncRow(rowId, {
      adminEditedPayload: adminEditedPayload as unknown as Record<string, unknown>,
      sourceRowKey: identity.sourceRowKey,
      contentHash: identity.contentHash,
      reviewNote,
    });

    await refreshBatchReviewCounts(row.batchId);
    revalidateAdminPaths(["/admin/content-sync"]);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    logger.error("admin_content_sync_save_failed", {
      rowId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  redirectBackFromFormData(formData, { selectedRowId: rowId });
}

export async function approveContentSyncRowAction(formData: FormData) {
  formData.set("decision", "approve");
  return reviewContentSyncRowAction(formData);
}

export async function rejectContentSyncRowAction(formData: FormData) {
  formData.set("decision", "reject");
  return reviewContentSyncRowAction(formData);
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

  if (
    row.reviewStatus === "approved" ||
    row.reviewStatus === "rejected" ||
    row.reviewStatus === "applied" ||
    row.applyStatus === "applied" ||
    row.applyStatus === "skipped"
  ) {
    throw new Error("Resolved sync rows cannot be reviewed again.");
  }

  const adminEditedPayload = await buildAdminEditedPayload(formData, row);
  const identity = buildEditedRowIdentity(adminEditedPayload);
  const reviewNote = normalizeOptionalText(optionalText(formData.get("review_note")));
  const { auth } = await requireAdminSupabase();

  const targetStatus = decision === "approve" ? "approved" : "rejected";
  
  try {
    const updated = await updateVocabSyncRow(rowId, {
      adminEditedPayload: adminEditedPayload as unknown as Record<string, unknown>,
      sourceRowKey: identity.sourceRowKey,
      contentHash: identity.contentHash,
      reviewStatus: targetStatus,
      reviewNote,
      approvedBy: decision === "approve" ? auth.user?.id ?? null : null,
      approvedAt: decision === "approve" ? new Date().toISOString() : null,
    });

    logger.info("admin_content_sync_review_success", {
      rowId,
      decision,
      newStatus: updated.reviewStatus,
      requestedStatus: targetStatus,
    });

    if (decision === "approve") {
      await applyApprovedVocabSyncRows({
        rowIds: [rowId],
      });
    }

    await refreshBatchReviewCounts(row.batchId);
    revalidateAdminPaths(["/admin", "/admin/content-sync", "/admin/words", "/vocabulary", "/lessons"]);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    logger.error("admin_content_sync_review_failed", {
      rowId,
      decision,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  redirectBackFromFormData(formData, { selectedRowId: null });
}

export async function bulkReviewContentSyncRowsAction(formData: FormData) {
  const decision = optionalText(formData.get("decision"));
  const batchId = optionalText(formData.get("batch_id"));
  const selectedRowIds = getSelectedRowIds(formData);

  if (!decision) {
    throw new Error("Bulk review decision is missing.");
  }

  if (selectedRowIds.length === 0) {
    redirectBackFromFormData(formData);
  }

  // Fetch rows to validate eligibility. If batchId is present, we only look inside that batch.
  // Otherwise, we fetch globally by IDs.
  const rows = batchId 
    ? await getVocabSyncPreviewRows(batchId)
    : await getGlobalVocabSyncPreviewRows();
    
  const selectedRowSet = new Set(selectedRowIds);
  const eligibleRows = rows.filter(
    (row) =>
      selectedRowSet.has(row.id) &&
      row.applyStatus === "pending" &&
      row.reviewStatus !== "approved" &&
      row.reviewStatus !== "rejected" &&
      row.reviewStatus !== "applied",
  );
  
  const eligibleIds = eligibleRows.map((row) => row.id);
  const affectedBatchIds = eligibleRows.map((row) => row.batchId);

  if (eligibleIds.length === 0) {
    redirectBackFromFormData(formData);
  }

  const { auth, supabase } = await requireAdminSupabase();
  const reviewStatus = decision === "approve" ? "approved" : "rejected";
  const approvedBy = decision === "approve" ? auth.user?.id ?? null : null;
  const approvedAt = decision === "approve" ? new Date().toISOString() : null;

  const CHUNK_SIZE = 100;
  for (let i = 0; i < eligibleIds.length; i += CHUNK_SIZE) {
    const chunk = eligibleIds.slice(i, i + CHUNK_SIZE);
    let query = supabase
      .from("vocab_sync_rows")
      .update({
        review_status: reviewStatus,
        approved_by: approvedBy,
        approved_at: approvedAt,
      })
      .in("id", chunk);

    if (batchId) {
      query = query.eq("batch_id", batchId);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }
  }

  logger.info("admin_content_sync_bulk_reviewed", {
    batchId,
    decision,
    rowCount: eligibleIds.length,
    userId: auth.user?.id ?? null,
  });

  if (decision === "approve") {
    await applyApprovedVocabSyncRows({
      rowIds: eligibleIds,
    });
  }

  await refreshBatchesReviewCounts(batchId ? [batchId] : affectedBatchIds);
  revalidateAdminPaths(["/admin", "/admin/content-sync", "/admin/words", "/vocabulary", "/lessons"]);
  redirectBackFromFormData(formData);
}

export async function approveAllEligibleContentSyncRowsAction(formData: FormData) {
  const batchId = optionalText(formData.get("batch_id"));

  // Fetch eligible rows. If in a batch, use batch fetcher.
  // Otherwise, use global fetcher with currently active filters (approximation).
  let rows: VocabSyncRow[] = [];
  if (batchId) {
    rows = await getVocabSyncPreviewRows(batchId);
  } else {
    // If global, we should only approve rows that are actually safe.
    // We could use return_q, return_change_type etc but for now let's keep it simple:
    // approve everything that is pending/needs_review and not invalid/conflict globally.
    rows = await getGlobalVocabSyncPreviewRows({
      reviewStatuses: ["pending", "needs_review"],
    });
  }

  const eligibleRows = rows.filter(
    (row) =>
      row.applyStatus === "pending" &&
      row.reviewStatus !== "approved" &&
      row.reviewStatus !== "applied" &&
      row.changeClassification !== "invalid" &&
      row.changeClassification !== "conflict",
  );
  
  const eligibleIds = eligibleRows.map((row) => row.id);
  const affectedBatchIds = eligibleRows.map((row) => row.batchId);

  if (eligibleIds.length === 0) {
    redirectBackFromFormData(formData);
  }

  const { auth, supabase } = await requireAdminSupabase();
  const approvedAt = new Date().toISOString();
  
  const CHUNK_SIZE = 100;
  for (let i = 0; i < eligibleIds.length; i += CHUNK_SIZE) {
    const chunk = eligibleIds.slice(i, i + CHUNK_SIZE);
    let query = supabase
      .from("vocab_sync_rows")
      .update({
        review_status: "approved",
        approved_by: auth.user?.id ?? null,
        approved_at: approvedAt,
      })
      .in("id", chunk);

    if (batchId) {
      query = query.eq("batch_id", batchId);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }
  }

  logger.info("admin_content_sync_approved_all_eligible", {
    batchId,
    rowCount: eligibleIds.length,
    userId: auth.user?.id ?? null,
  });

  await applyApprovedVocabSyncRows({
    rowIds: eligibleIds,
  });

  await refreshBatchesReviewCounts(batchId ? [batchId] : affectedBatchIds);
  revalidateAdminPaths(["/admin", "/admin/content-sync", "/admin/words", "/vocabulary", "/lessons"]);
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

  if (selectedRowIds.length === 0) {
    redirectBackFromFormData(formData);
  }

  await applyApprovedVocabSyncRows({
    batchId: batchId ?? undefined,
    rowIds: selectedRowIds,
  });

  if (batchId) {
    await refreshBatchReviewCounts(batchId);
  }

  revalidateAdminPaths(["/admin", "/admin/content-sync", "/admin/words", "/vocabulary", "/lessons"]);
  redirectBackFromFormData(formData);
}

export async function applyAllApprovedContentSyncRowsAction(formData: FormData) {
  const batchId = optionalText(formData.get("batch_id"));
  
  if (batchId) {
    await applyApprovedVocabSyncRows({ batchId });
    await refreshBatchReviewCounts(batchId);
  } else {
    const rows = await getGlobalVocabSyncPreviewRows({
      reviewStatuses: ["approved"],
    });
    
    const eligibleRows = rows.filter(
      (row) =>
        row.reviewStatus === "approved" &&
        row.applyStatus !== "applied" &&
        row.applyStatus !== "skipped"
    );
    
    const eligibleIds = eligibleRows.map((row) => row.id);
    
    if (eligibleIds.length > 0) {
      await applyApprovedVocabSyncRows({ rowIds: eligibleIds });
    }
  }

  revalidateAdminPaths(["/admin", "/admin/content-sync", "/admin/words", "/vocabulary", "/lessons"]);
  redirectBackFromFormData(formData);
}
