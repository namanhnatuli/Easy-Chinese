import { z } from "zod";

import { optionalText, requireAdminSupabase, revalidateAdminPaths, redirectTo } from "@/features/admin/shared";
import {
  ContentSyncFilters,
  ContentSyncSummary,
  buildContentSyncPath,
  parseContentSyncFilters,
  summarizeRows,
} from "@/features/admin/content-sync-utils";
import { buildGrammarContentHash } from "@/features/grammar-sync/content-hash";
import { buildGrammarSourceRowKey } from "@/features/grammar-sync/normalize";
import { applyApprovedGrammarSyncRows } from "@/features/grammar-sync/apply";
import {
  getGlobalGrammarSyncPreviewRows,
  getGrammarSyncPreviewBatch,
  getGrammarSyncPreviewRows,
  getGrammarSyncStagedRowCounts,
  getRecentGrammarSyncPreviewBatches,
  startGrammarSyncPreview,
} from "@/features/grammar-sync/preview";
import {
  getGrammarSyncRow,
  updateGrammarSyncBatch,
  updateGrammarSyncRow,
} from "@/features/grammar-sync/repository";
import type {
  GrammarSyncBatch,
  GrammarSyncRow,
  NormalizedGrammarExample,
  NormalizedGrammarSyncPayload,
} from "@/features/grammar-sync/types";
import { logger } from "@/lib/logger";

export interface GrammarSyncPageData {
  batches: GrammarSyncBatch[];
  selectedBatch: GrammarSyncBatch | null;
  filteredRows: GrammarSyncRow[];
  selectedRow: GrammarSyncRow | null;
  summary: ContentSyncSummary | null;
  filters: ContentSyncFilters;
  batchRowCounts: Map<string, number>;
}

function buildGrammarContentSyncPath(filters: Parameters<typeof buildContentSyncPath>[0]) {
  const path = buildContentSyncPath(filters);
  return path.includes("?") ? `${path}&sync=grammar` : `${path}?sync=grammar`;
}

function getSelectedRowIds(formData: FormData) {
  return formData
    .getAll("selected_row_ids")
    .map((value) => String(value))
    .filter(Boolean);
}

function parseInteger(value: string | null) {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseBooleanValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function parseGrammarExamplesTextarea(value: FormDataEntryValue | null): NormalizedGrammarExample[] {
  if (typeof value !== "string") return [];

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [chineseText = "", pinyin = "", vietnameseMeaning = ""] = line
        .split("|")
        .map((part) => part.trim());

      return {
        chineseText,
        pinyin: pinyin || null,
        vietnameseMeaning: vietnameseMeaning || null,
        sortOrder: index + 1,
      };
    })
    .filter((example) => example.chineseText);
}

const editedGrammarPayloadSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  structureText: z.string().trim().min(1),
  explanationVi: z.string().trim().min(1),
  notes: z.string().trim().nullable(),
  examples: z.array(
    z.object({
      chineseText: z.string().trim().min(1),
      pinyin: z.string().trim().nullable(),
      vietnameseMeaning: z.string().trim().nullable(),
      sortOrder: z.number().int().positive(),
    }),
  ),
  hskLevel: z.number().int().min(1).max(9),
  sourceConfidence: z.enum(["low", "medium", "high"]).nullable(),
  ambiguityFlag: z.boolean(),
  ambiguityNote: z.string().trim().nullable(),
  reviewStatus: z.enum(["pending", "needs_review", "approved", "rejected", "applied"]),
  aiStatus: z.enum(["pending", "processing", "done", "failed", "skipped"]),
  sourceUpdatedAt: z.string().trim().nullable(),
});

function buildEditedGrammarPayload(formData: FormData, row: GrammarSyncRow): NormalizedGrammarSyncPayload {
  const basePayload = (row.adminEditedPayload ?? row.normalizedPayload ?? {}) as Partial<NormalizedGrammarSyncPayload>;
  const hskLevel = parseInteger(optionalText(formData.get("hsk_level")));
  const sourceConfidence = optionalText(formData.get("source_confidence"));

  return editedGrammarPayloadSchema.parse({
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    structureText: String(formData.get("structure_text") ?? "").trim(),
    explanationVi: String(formData.get("explanation_vi") ?? "").trim(),
    notes: optionalText(formData.get("notes")),
    examples: parseGrammarExamplesTextarea(formData.get("examples_text")),
    hskLevel,
    sourceConfidence: sourceConfidence || null,
    ambiguityFlag: parseBooleanValue(formData.get("ambiguity_flag")),
    ambiguityNote: optionalText(formData.get("ambiguity_note")),
    reviewStatus: (optionalText(formData.get("review_status")) ?? row.reviewStatus) as NormalizedGrammarSyncPayload["reviewStatus"],
    aiStatus: (optionalText(formData.get("ai_status")) ?? row.aiStatus) as NormalizedGrammarSyncPayload["aiStatus"],
    sourceUpdatedAt:
      optionalText(formData.get("source_updated_at")) ??
      (typeof basePayload.sourceUpdatedAt === "string" ? basePayload.sourceUpdatedAt : row.sourceUpdatedAt),
  });
}

function getPayloadText(row: GrammarSyncRow, key: string) {
  const payload = (row.adminEditedPayload ?? row.normalizedPayload ?? {}) as Record<string, unknown>;
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function filterGrammarRows(rows: GrammarSyncRow[], filters: ContentSyncFilters) {
  const needle = filters.q.toLowerCase();

  return rows.filter((row) => {
    if (filters.changeType !== "all" && row.changeClassification !== filters.changeType) return false;

    if (filters.reviewStatus !== "all") {
      if (row.reviewStatus !== filters.reviewStatus) return false;
    } else if (filters.view === "queue") {
      if (row.reviewStatus === "approved" || row.reviewStatus === "rejected" || row.reviewStatus === "applied") {
        return false;
      }
    } else if (filters.view === "resolved") {
      if (row.reviewStatus === "pending" || row.reviewStatus === "needs_review") return false;
    }

    if (filters.applyStatus !== "all" && row.applyStatus !== filters.applyStatus) return false;

    if (!needle) return true;

    const haystacks = [
      getPayloadText(row, "title"),
      getPayloadText(row, "slug"),
      getPayloadText(row, "structureText"),
      getPayloadText(row, "explanationVi"),
      row.sourceRowKey,
      row.reviewNote ?? "",
      row.errorMessage ?? "",
    ];

    return haystacks.some((value) => value.toLowerCase().includes(needle));
  });
}

async function refreshGrammarBatchReviewCounts(batchId: string) {
  const rows = await getGrammarSyncPreviewRows(batchId);
  const summary = summarizeRows(rows as any);
  const approvedRows = rows.filter(
    (row) => row.reviewStatus === "approved" && row.applyStatus !== "applied" && row.applyStatus !== "skipped",
  ).length;
  const rejectedRows = rows.filter((row) => row.reviewStatus === "rejected").length;
  const appliedRows = rows.filter(
    (row) => row.reviewStatus === "applied" || row.applyStatus === "applied" || row.applyStatus === "skipped",
  ).length;
  const pendingRows = rows.filter(
    (row) =>
      row.reviewStatus === "pending" ||
      row.reviewStatus === "needs_review" ||
      row.applyStatus === "failed" ||
      (row.reviewStatus === "approved" && row.applyStatus === "pending"),
  ).length;

  await updateGrammarSyncBatch(batchId, {
    pendingRows,
    approvedRows,
    rejectedRows,
    appliedRows,
    errorRows: summary.invalid + summary.conflict,
  });
}

async function refreshGrammarBatchesReviewCounts(batchIds: string[]) {
  for (const batchId of [...new Set(batchIds)].filter(Boolean)) {
    await refreshGrammarBatchReviewCounts(batchId);
  }
}

function redirectBackFromFormData(formData: FormData, overrides: { selectedRowId?: string | null } = {}) {
  const batchId = optionalText(formData.get("batch_id"));
  const view = optionalText(formData.get("return_view"));
  const q = optionalText(formData.get("return_q"));
  const changeType = optionalText(formData.get("return_change_type"));
  const reviewStatus = optionalText(formData.get("return_review_status"));
  const applyStatus = optionalText(formData.get("return_apply_status"));
  const selectedRowId = overrides.selectedRowId ?? optionalText(formData.get("return_row_id"));

  redirectTo(
    buildGrammarContentSyncPath({
      batchId,
      view,
      q,
      changeType,
      reviewStatus,
      applyStatus,
      selectedRowId,
    }),
  );
}

export function parseGrammarContentSyncFilters(searchParams: Record<string, string | string[] | undefined>) {
  return parseContentSyncFilters(searchParams);
}

export async function getGrammarSyncAdminPageData(filters: ContentSyncFilters): Promise<GrammarSyncPageData> {
  const batches = await getRecentGrammarSyncPreviewBatches(20);
  const selectedBatch = filters.batchId ? await getGrammarSyncPreviewBatch(filters.batchId) : null;
  const batchRowCounts = await getGrammarSyncStagedRowCounts(batches.map((batch) => batch.id));

  if (!selectedBatch && filters.batchId) {
    return {
      batches,
      selectedBatch: null,
      filteredRows: [],
      selectedRow: null,
      summary: null,
      filters: { ...filters, batchId: null, selectedRowId: null },
      batchRowCounts,
    };
  }

  const allRows = selectedBatch
    ? await getGrammarSyncPreviewRows(selectedBatch.id)
    : filters.view === "queue"
      ? await getGlobalGrammarSyncPreviewRows({ reviewStatuses: ["pending", "needs_review"] })
      : await getGlobalGrammarSyncPreviewRows({ reviewStatuses: ["approved", "rejected", "applied"] });
  const filteredRows = filterGrammarRows(allRows, {
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
    summary: allRows.length > 0 ? summarizeRows(allRows as any) : null,
    filters: {
      ...filters,
      batchId: selectedBatch?.id ?? null,
      selectedRowId: selectedRow?.id ?? null,
    },
    batchRowCounts,
  };
}

export async function startGrammarContentSyncPreviewAction(formData: FormData) {
  "use server";

  const spreadsheetId = optionalText(formData.get("spreadsheet_id"));
  const sheetName = optionalText(formData.get("sheet_name"));

  try {
    await startGrammarSyncPreview({
      spreadsheetId: spreadsheetId ?? undefined,
      sheetName: sheetName ?? undefined,
      syncFromRow: parseInteger(optionalText(formData.get("sync_from_row"))),
      syncToRow: parseInteger(optionalText(formData.get("sync_to_row"))),
    });

    revalidateAdminPaths(["/admin", "/admin/content-sync", "/admin/grammar", "/grammar"]);
  } catch (error) {
    logger.error("admin_grammar_sync_preview_failed", error, { spreadsheetId, sheetName });
    redirectTo(
      buildGrammarContentSyncPath({
        error: error instanceof Error ? error.message : "Failed to start grammar sync preview.",
      }),
    );
  }

  redirectTo(buildGrammarContentSyncPath({}));
}

async function reviewGrammarSyncRows(rowIds: string[], decision: "approve" | "reject") {
  const rows = await Promise.all(rowIds.map((id) => getGrammarSyncRow(id)));
  const eligibleRows = rows.filter(
    (row): row is GrammarSyncRow =>
      row !== null &&
      row.applyStatus === "pending" &&
      row.reviewStatus !== "approved" &&
      row.reviewStatus !== "rejected" &&
      row.reviewStatus !== "applied" &&
      (decision === "reject" || (row.changeClassification !== "invalid" && row.changeClassification !== "conflict")),
  );

  if (eligibleRows.length === 0) return [];

  const { auth } = await requireAdminSupabase();
  const reviewStatus = decision === "approve" ? "approved" : "rejected";
  const approvedBy = decision === "approve" ? auth.user?.id ?? null : null;
  const approvedAt = decision === "approve" ? new Date().toISOString() : null;

  const updatedRows: GrammarSyncRow[] = [];
  for (const row of eligibleRows) {
    updatedRows.push(
      await updateGrammarSyncRow(row.id, {
        reviewStatus,
        approvedBy,
        approvedAt,
      }),
    );
  }

  await refreshGrammarBatchesReviewCounts(eligibleRows.map((row) => row.batchId));
  return updatedRows;
}

export async function approveGrammarSyncRowAction(formData: FormData) {
  "use server";

  const rowId = optionalText(formData.get("row_id"));
  if (!rowId) throw new Error("Row id is required.");
  await reviewGrammarSyncRows([rowId], "approve");
  revalidateAdminPaths(["/admin/content-sync"]);
  redirectBackFromFormData(formData, { selectedRowId: rowId });
}

export async function saveGrammarSyncRowEditsAction(formData: FormData) {
  "use server";

  const rowId = optionalText(formData.get("row_id"));
  if (!rowId) throw new Error("Row id is required.");

  const row = await getGrammarSyncRow(rowId);
  if (!row) throw new Error("Grammar sync row not found.");
  if (row.reviewStatus === "applied" || row.applyStatus === "applied" || row.applyStatus === "skipped") {
    throw new Error("Applied grammar sync rows cannot be edited.");
  }

  const payload = buildEditedGrammarPayload(formData, row);
  const contentHash = buildGrammarContentHash(payload);
  const sourceRowKey = buildGrammarSourceRowKey(payload);
  const nextChangeClassification =
    row.changeClassification === "invalid"
      ? row.matchedGrammarIds.length > 0
        ? "changed"
        : "new"
      : row.changeClassification;

  await updateGrammarSyncRow(row.id, {
    adminEditedPayload: payload as unknown as Record<string, unknown>,
    sourceRowKey,
    contentHash,
    changeClassification: nextChangeClassification,
    parseErrors: [],
    errorMessage: null,
    reviewStatus: payload.reviewStatus,
    aiStatus: payload.aiStatus,
    sourceConfidence: payload.sourceConfidence,
  });

  await refreshGrammarBatchReviewCounts(row.batchId);
  revalidateAdminPaths(["/admin/content-sync"]);
  redirectBackFromFormData(formData, { selectedRowId: row.id });
}

export async function rejectGrammarSyncRowAction(formData: FormData) {
  "use server";

  const rowId = optionalText(formData.get("row_id"));
  if (!rowId) throw new Error("Row id is required.");
  await reviewGrammarSyncRows([rowId], "reject");
  revalidateAdminPaths(["/admin/content-sync"]);
  redirectBackFromFormData(formData, { selectedRowId: null });
}

export async function approveAllEligibleGrammarSyncRowsAction(formData: FormData) {
  "use server";

  const batchId = optionalText(formData.get("batch_id"));
  const rows = batchId
    ? await getGrammarSyncPreviewRows(batchId)
    : await getGlobalGrammarSyncPreviewRows({ reviewStatuses: ["pending", "needs_review"] });
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

  await reviewGrammarSyncRows(eligibleIds, "approve");
  revalidateAdminPaths(["/admin/content-sync"]);
  redirectBackFromFormData(formData);
}

export async function bulkReviewGrammarSyncRowsAction(formData: FormData) {
  "use server";

  const decision = optionalText(formData.get("decision"));
  const selectedRowIds = getSelectedRowIds(formData);
  if (selectedRowIds.length === 0 || (decision !== "approve" && decision !== "reject")) {
    redirectBackFromFormData(formData);
    return;
  }

  await reviewGrammarSyncRows(selectedRowIds, decision);
  revalidateAdminPaths(["/admin/content-sync"]);
  redirectBackFromFormData(formData);
}

export async function applyGrammarSyncRowAction(formData: FormData) {
  "use server";

  const rowId = optionalText(formData.get("row_id"));
  if (!rowId) throw new Error("Row id is required.");
  const row = await getGrammarSyncRow(rowId);
  if (!row) throw new Error("Grammar sync row not found.");

  await applyApprovedGrammarSyncRows({ rowIds: [rowId] });
  await refreshGrammarBatchReviewCounts(row.batchId);
  revalidateAdminPaths(["/admin", "/admin/content-sync", "/admin/grammar", "/grammar"]);
  redirectBackFromFormData(formData, { selectedRowId: rowId });
}

export async function applyAllApprovedGrammarSyncRowsAction(formData: FormData) {
  "use server";

  const batchId = optionalText(formData.get("batch_id"));
  const selectedRowIds = getSelectedRowIds(formData);

  if (selectedRowIds.length > 0) {
    await applyApprovedGrammarSyncRows({ rowIds: selectedRowIds });
    const rows = await Promise.all(selectedRowIds.map((id) => getGrammarSyncRow(id)));
    await refreshGrammarBatchesReviewCounts(rows.filter((row): row is GrammarSyncRow => Boolean(row)).map((row) => row.batchId));
  } else if (batchId) {
    await applyApprovedGrammarSyncRows({ batchId });
    await refreshGrammarBatchReviewCounts(batchId);
  } else {
    const rows = await getGlobalGrammarSyncPreviewRows({ reviewStatuses: ["approved"] });
    await applyApprovedGrammarSyncRows({ rowIds: rows.map((row) => row.id) });
    await refreshGrammarBatchesReviewCounts(rows.map((row) => row.batchId));
  }

  revalidateAdminPaths(["/admin", "/admin/content-sync", "/admin/grammar", "/grammar"]);
  redirectBackFromFormData(formData);
}
