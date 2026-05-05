import "server-only";

import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { readGoogleSheetRows } from "@/features/vocabulary-sync/google-sheets";
import { derivePreviewWorkflowState, summarizePreviewRows } from "@/features/vocabulary-sync/preview-summary";
import { parseAndNormalizeGrammarSyncRow } from "@/features/grammar-sync/normalize";
import { classifyGrammarSyncRow } from "@/features/grammar-sync/matching";
import { fetchExistingGrammarSnapshots } from "@/features/grammar-sync/snapshots";
import {
  createGrammarSyncBatch,
  createGrammarSyncRows,
  getGrammarSyncBatch,
  getGrammarSyncRowCountsForBatches,
  listGrammarSyncBatches,
  listGrammarSyncRows,
  listLatestGrammarSyncRowsBySourceKeys,
  updateGrammarSyncBatch,
  updateGrammarSyncRow,
} from "@/features/grammar-sync/repository";
import type { GrammarSyncRow } from "@/features/grammar-sync/types";
import type { WordReviewStatus } from "@/features/vocabulary-sync/types";

export const grammarSyncPreviewRequestSchema = z.object({
  spreadsheetId: z.string().trim().min(1).optional(),
  sheetName: z.string().trim().min(1).optional(),
  syncFromRow: z.number().int().positive().optional(),
  syncToRow: z.number().int().positive().optional(),
});

function requireSpreadsheetId(inputSpreadsheetId?: string) {
  const env = getServerEnv();
  const spreadsheetId = inputSpreadsheetId?.trim() || env.GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required. Provide it in the request or set GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID.");
  }

  return spreadsheetId;
}

export async function startGrammarSyncPreview(input: z.infer<typeof grammarSyncPreviewRequestSchema>) {
  const env = getServerEnv();
  const spreadsheetId = requireSpreadsheetId(input.spreadsheetId);
  const sheetName = input.sheetName?.trim() || env.GOOGLE_SHEETS_GRAMMAR_SHEET_NAME;

  if (!sheetName) {
    throw new Error("Grammar sheet name is required. Provide it or set GOOGLE_SHEETS_GRAMMAR_SHEET_NAME.");
  }

  const batch = await createGrammarSyncBatch({
    externalSource: "google_sheets",
    sourceDocumentId: spreadsheetId,
    sourceSheetName: sheetName,
    rawBatchPayload: {
      spreadsheetId,
      requestedSheetName: sheetName,
      syncFromRow: input.syncFromRow ?? null,
      syncToRow: input.syncToRow ?? null,
    },
    notes: "Grammar preview sync generated from Google Sheets.",
    totalRows: 0,
  });

  try {
    await updateGrammarSyncBatch(batch.id, {
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const sheet = await readGoogleSheetRows({
      spreadsheetId,
      sheetName,
      fromRow: input.syncFromRow,
      toRow: input.syncToRow,
    });
    const parsedRows = sheet.rows.map((row) =>
      parseAndNormalizeGrammarSyncRow({
        rowNumber: row.rowNumber,
        values: row.values,
      }),
    );

    const duplicateSourceRowKeys = parsedRows.reduce<Map<string, number>>((result, row) => {
      result.set(row.sourceRowKey, (result.get(row.sourceRowKey) ?? 0) + 1);
      return result;
    }, new Map());

    for (const row of parsedRows) {
      if ((duplicateSourceRowKeys.get(row.sourceRowKey) ?? 0) > 1) {
        row.parseErrors.push("Duplicate source_row_key detected within this batch.");
        row.initialChangeClassification = "conflict";
      }
    }

    const existingGrammar = await fetchExistingGrammarSnapshots();
    const existingRowsBySourceRowKey = new Map(
      (await listLatestGrammarSyncRowsBySourceKeys(parsedRows.map((row) => row.sourceRowKey))).map(
        (row) => [row.sourceRowKey, row] as const,
      ),
    );
    const classifiedRows = parsedRows
      .map((row) => {
        const classification = row.initialChangeClassification === "conflict"
          ? {
              changeClassification: "conflict" as const,
              matchResult: "conflict" as const,
              matchedGrammarIds: [],
              diffSummary: { parseErrors: row.parseErrors },
              errorMessage: row.parseErrors.join(" "),
            }
          : classifyGrammarSyncRow(row, existingGrammar);
        const workflow = derivePreviewWorkflowState({
          changeClassification: classification.changeClassification,
          errorMessage: classification.errorMessage,
          parseErrors: row.parseErrors,
          diffSummary: classification.diffSummary,
        });

        return { parsed: row, classification, workflow };
      })
      .filter(({ parsed, classification }) => {
        const existingRow = existingRowsBySourceRowKey.get(parsed.sourceRowKey);
        return classification.changeClassification !== "unchanged" || existingRow?.changeClassification !== "unchanged";
      });
    const rowsToStage = classifiedRows.filter(
      ({ classification }) => classification.changeClassification !== "unchanged",
    );

    await createGrammarSyncRows(
      batch.id,
        rowsToStage
        .filter(({ parsed }) => {
          const existingRow = existingRowsBySourceRowKey.get(parsed.sourceRowKey);
          return !existingRow || ["rejected", "applied"].includes(existingRow.reviewStatus);
        })
        .map(({ parsed, classification, workflow }) => ({
          sourceRowKey: parsed.sourceRowKey,
          sourceRowNumber: parsed.rowNumber,
          sourceUpdatedAt: parsed.normalizedPayload.sourceUpdatedAt,
          rawPayload: parsed.rawPayload,
          normalizedPayload: parsed.normalizedPayload as unknown as Record<string, unknown>,
          contentHash: parsed.contentHash,
          changeClassification: classification.changeClassification,
          matchResult: classification.matchResult,
          matchedGrammarIds: classification.matchedGrammarIds,
          parseErrors: parsed.parseErrors,
          reviewStatus: workflow.reviewStatus,
          applyStatus: workflow.applyStatus,
          aiStatus: parsed.normalizedPayload.aiStatus,
          sourceConfidence: parsed.normalizedPayload.sourceConfidence,
          diffSummary: classification.diffSummary,
          errorMessage: classification.errorMessage,
        })),
    );

    for (const { parsed, classification, workflow } of rowsToStage) {
      const existingRow = existingRowsBySourceRowKey.get(parsed.sourceRowKey);
      if (!existingRow || ["rejected", "applied"].includes(existingRow.reviewStatus)) {
        continue;
      }

      await updateGrammarSyncRow(existingRow.id, {
        batchId: batch.id,
        adminEditedPayload: null,
        sourceRowKey: parsed.sourceRowKey,
        sourceRowNumber: parsed.rowNumber,
        sourceUpdatedAt: parsed.normalizedPayload.sourceUpdatedAt,
        rawPayload: parsed.rawPayload,
        normalizedPayload: parsed.normalizedPayload as unknown as Record<string, unknown>,
        contentHash: parsed.contentHash,
        changeClassification: classification.changeClassification,
        matchResult: classification.matchResult,
        matchedGrammarIds: classification.matchedGrammarIds,
        parseErrors: parsed.parseErrors,
        reviewStatus: workflow.reviewStatus,
        applyStatus: workflow.applyStatus,
        aiStatus: parsed.normalizedPayload.aiStatus,
        sourceConfidence: parsed.normalizedPayload.sourceConfidence,
        diffSummary: classification.diffSummary,
        errorMessage: classification.errorMessage,
        approvedBy: null,
        approvedAt: null,
        appliedGrammarId: null,
        appliedBy: null,
        appliedAt: null,
      });
    }

    const summaryCounts = summarizePreviewRows(
      classifiedRows.map(({ classification, workflow }) => ({
        changeClassification: classification.changeClassification,
        reviewStatus: workflow.reviewStatus,
        applyStatus: workflow.applyStatus,
      })),
    );
    const pendingRows = rowsToStage.filter(
      ({ workflow }) => workflow.reviewStatus === "pending" || workflow.reviewStatus === "needs_review",
    ).length;
    const approvedRows = rowsToStage.filter(({ workflow }) => workflow.reviewStatus === "approved").length;
    const appliedRows = rowsToStage.filter(
      ({ workflow }) => workflow.reviewStatus === "applied" || workflow.applyStatus === "applied" || workflow.applyStatus === "skipped",
    ).length;

    const completedBatch = await updateGrammarSyncBatch(batch.id, {
      status: "completed",
      totalRows: parsedRows.length,
      pendingRows,
      approvedRows,
      appliedRows,
      errorRows: (summaryCounts.invalid ?? 0) + (summaryCounts.conflict ?? 0),
      rawBatchPayload: {
        spreadsheetId: sheet.spreadsheetId,
        sheetName: sheet.sheetName,
        sheetId: sheet.sheetId,
        headers: sheet.headers,
        summaryCounts,
      },
      completedAt: new Date().toISOString(),
    });

    logger.info("grammar_sync_preview_completed", {
      batchId: completedBatch.id,
      spreadsheetId,
      sheetName,
      totalRows: parsedRows.length,
      stagedRows: rowsToStage.length,
      summaryCounts,
    });

    return { batch: completedBatch, summaryCounts };
  } catch (error) {
    logger.error("grammar_sync_preview_failed", error, { batchId: batch.id, spreadsheetId, sheetName });
    await updateGrammarSyncBatch(batch.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      notes: error instanceof Error ? error.message : "Grammar preview sync failed.",
    });
    throw error;
  }
}

export async function getRecentGrammarSyncPreviewBatches(limit = 20) {
  return listGrammarSyncBatches(limit);
}

export async function getGrammarSyncPreviewBatch(batchId: string) {
  return getGrammarSyncBatch(batchId);
}

export async function getGrammarSyncPreviewRows(
  batchId: string,
  filters: {
    changeType?: GrammarSyncRow["changeClassification"];
    reviewStatus?: WordReviewStatus;
    applyStatus?: GrammarSyncRow["applyStatus"];
    limit?: number;
  } = {},
) {
  return listGrammarSyncRows({
    batchId,
    changeType: filters.changeType,
    reviewStatuses: filters.reviewStatus ? [filters.reviewStatus] : undefined,
    applyStatus: filters.applyStatus,
    limit: filters.limit,
  });
}

export async function getGlobalGrammarSyncPreviewRows(filters: {
  batchId?: string;
  changeType?: GrammarSyncRow["changeClassification"];
  reviewStatuses?: WordReviewStatus[];
  applyStatus?: GrammarSyncRow["applyStatus"];
  limit?: number;
} = {}) {
  return listGrammarSyncRows(filters);
}

export async function getGrammarSyncStagedRowCounts(batchIds: string[]) {
  return getGrammarSyncRowCountsForBatches(batchIds);
}
