import "server-only";

import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { readGoogleSheetRows } from "@/features/vocabulary-sync/google-sheets";
import { classifyVocabSyncRow } from "@/features/vocabulary-sync/matching";
import { parseAndNormalizeVocabSyncRow } from "@/features/vocabulary-sync/normalize";
import {
  derivePreviewWorkflowState,
  summarizePreviewRows,
} from "@/features/vocabulary-sync/preview-summary";
import {
  createVocabSyncBatch,
  createVocabSyncRows,
  getVocabSyncRowCountsForBatches,
  getVocabSyncBatch,
  getLatestCompletedVocabSyncBatch,
  listLatestVocabSyncRowsBySourceKeys,
  listVocabSyncBatches,
  listVocabSyncRowsForBatch,
  listVocabSyncRowsGlobal,
  updateVocabSyncBatch,
  updateVocabSyncRow,
} from "@/features/vocabulary-sync/repository";
import { fetchExistingWordCandidates } from "@/features/vocabulary-sync/word-snapshots";
import {
  resolveExistingSyncRowAction,
  wasRowUpdatedAfterLastCompletedBatch,
} from "@/features/vocabulary-sync/preview-locks";
import type { VocabSyncRow, WordReviewStatus } from "@/features/vocabulary-sync/types";
import { z } from "zod";

export const vocabSyncPreviewRequestSchema = z.object({
  spreadsheetId: z.string().trim().min(1).optional(),
  sheetName: z.string().trim().min(1).optional(),
});

function requireSpreadsheetId(inputSpreadsheetId?: string) {
  const env = getServerEnv();
  const spreadsheetId = inputSpreadsheetId?.trim() || env.GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required. Provide it in the request or set GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID.");
  }

  return spreadsheetId;
}

export async function startVocabSyncPreview(input: z.infer<typeof vocabSyncPreviewRequestSchema>) {
  const env = getServerEnv();
  const spreadsheetId = requireSpreadsheetId(input.spreadsheetId);
  const sheetName = input.sheetName?.trim() || env.GOOGLE_SHEETS_DEFAULT_SHEET_NAME;

  if (!sheetName) {
    throw new Error("Sheet name is required. Provide it in the request or set GOOGLE_SHEETS_DEFAULT_SHEET_NAME.");
  }

  const batch = await createVocabSyncBatch({
    externalSource: "google_sheets",
    sourceDocumentId: spreadsheetId,
    sourceSheetName: sheetName,
    rawBatchPayload: {
      spreadsheetId,
      requestedSheetName: sheetName,
    },
    notes: "Preview sync generated from Google Sheets.",
    totalRows: 0,
  });

  try {
    await updateVocabSyncBatch(batch.id, {
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const previousCompletedBatch = await getLatestCompletedVocabSyncBatch(batch.id);
    const lastCompletedBatchRunAt =
      previousCompletedBatch?.completedAt ??
      previousCompletedBatch?.startedAt ??
      previousCompletedBatch?.createdAt ??
      null;

    const sheet = await readGoogleSheetRows({
      spreadsheetId,
      sheetName,
    });

    const parsedRows = sheet.rows
      .map((row) =>
        parseAndNormalizeVocabSyncRow({
          rowNumber: row.rowNumber,
          values: row.values,
        }),
      )
      .filter(
        (row) =>
          row.normalizedPayload.normalizedText &&
          row.normalizedPayload.pinyin &&
          row.normalizedPayload.meaningsVi,
      );

    const duplicateSourceRowKeys = parsedRows.reduce<Map<string, number>>((result, row) => {
      if (!row.sourceRowKey) {
        return result;
      }

      result.set(row.sourceRowKey, (result.get(row.sourceRowKey) ?? 0) + 1);
      return result;
    }, new Map());

    for (const row of parsedRows) {
      if (row.sourceRowKey && (duplicateSourceRowKeys.get(row.sourceRowKey) ?? 0) > 1) {
        row.parseErrors.push("Duplicate source_row_key detected within this batch.");
        row.initialChangeClassification = "conflict";
      }
    }

    const existingWords = await fetchExistingWordCandidates(parsedRows);
    const existingRowsBySourceRowKey = new Map(
      (
        await listLatestVocabSyncRowsBySourceKeys(
          parsedRows.map((row) => row.sourceRowKey).filter(Boolean),
        )
      ).map((row) => [row.sourceRowKey, row] as const),
    );

    const classifiedRows = parsedRows.map((row) => {
      const classification = classifyVocabSyncRow(row, existingWords);
      const workflow = derivePreviewWorkflowState({
        changeClassification: classification.changeClassification,
        errorMessage: classification.errorMessage,
        parseErrors: row.parseErrors,
        diffSummary: classification.diffSummary,
      });

      return {
        parsed: row,
        classification,
        workflow,
      };
    });

    const staleByLastBatchRows = classifiedRows.filter(
      ({ parsed }) =>
        !wasRowUpdatedAfterLastCompletedBatch(
          parsed.normalizedPayload.sourceUpdatedAt,
          lastCompletedBatchRunAt,
        ),
    );

    const rowsNewerThanLastBatch = classifiedRows.filter(
      ({ parsed }) => {
        return wasRowUpdatedAfterLastCompletedBatch(
          parsed.normalizedPayload.sourceUpdatedAt,
          lastCompletedBatchRunAt,
        );
      },
    );

    const rowsToUpdate = rowsNewerThanLastBatch.filter(({ parsed }) => {
      const existingRow = parsed.sourceRowKey
        ? existingRowsBySourceRowKey.get(parsed.sourceRowKey)
        : null;

      return resolveExistingSyncRowAction(existingRow) === "update";
    });

    const closedRows = rowsNewerThanLastBatch.filter(({ parsed }) => {
      const existingRow = parsed.sourceRowKey
        ? existingRowsBySourceRowKey.get(parsed.sourceRowKey)
        : null;

      return resolveExistingSyncRowAction(existingRow) === "skip_closed";
    });

    const rowsToCreate = rowsNewerThanLastBatch.filter(({ parsed }) => {
      const existingRow = parsed.sourceRowKey
        ? existingRowsBySourceRowKey.get(parsed.sourceRowKey)
        : null;

      return resolveExistingSyncRowAction(existingRow) === "create";
    });

    const createdRows = rowsToCreate.filter(
      ({ classification }) => classification.changeClassification !== "unchanged",
    );

    const updatedRows = rowsToUpdate.filter(
      ({ parsed, classification }) => {
        const existingRow = parsed.sourceRowKey
          ? existingRowsBySourceRowKey.get(parsed.sourceRowKey)
          : null;

        if (!existingRow) {
          return false;
        }

        return classification.changeClassification !== "unchanged" || existingRow.changeClassification !== "unchanged";
      },
    );

    await createVocabSyncRows(
      batch.id,
      createdRows.map(({ parsed, classification, workflow }) => ({
        externalSource: "google_sheets",
        externalId: parsed.normalizedPayload.externalId,
        sourceRowKey: parsed.sourceRowKey || `row:${parsed.rowNumber}`,
        sourceRowNumber: parsed.rowNumber,
        sourceUpdatedAt: parsed.normalizedPayload.sourceUpdatedAt,
        rawPayload: parsed.rawPayload,
        normalizedPayload: parsed.normalizedPayload as unknown as Record<string, unknown>,
        contentHash: parsed.contentHash,
        changeClassification: classification.changeClassification,
        matchResult: classification.matchResult,
        matchedWordIds: classification.matchedWordIds,
        parseErrors: parsed.parseErrors,
        reviewStatus: workflow.reviewStatus,
        applyStatus: workflow.applyStatus,
        aiStatus: parsed.normalizedPayload.aiStatus,
        sourceConfidence: parsed.normalizedPayload.sourceConfidence,
        diffSummary: classification.diffSummary,
        reviewNote: workflow.reviewNote,
        errorMessage: classification.errorMessage,
      })),
    );

    for (const { parsed, classification, workflow } of updatedRows) {
      const existingRow = parsed.sourceRowKey
        ? existingRowsBySourceRowKey.get(parsed.sourceRowKey)
        : null;

      if (!existingRow) {
        continue;
      }

      await updateVocabSyncRow(existingRow.id, {
        batchId: batch.id,
        externalSource: "google_sheets",
        externalId: parsed.normalizedPayload.externalId,
        adminEditedPayload: null,
        sourceRowKey: parsed.sourceRowKey || `row:${parsed.rowNumber}`,
        sourceRowNumber: parsed.rowNumber,
        sourceUpdatedAt: parsed.normalizedPayload.sourceUpdatedAt,
        rawPayload: parsed.rawPayload,
        normalizedPayload: parsed.normalizedPayload as unknown as Record<string, unknown>,
        contentHash: parsed.contentHash,
        changeClassification: classification.changeClassification,
        matchResult: classification.matchResult,
        matchedWordIds: classification.matchedWordIds,
        parseErrors: parsed.parseErrors,
        reviewStatus: workflow.reviewStatus,
        applyStatus: workflow.applyStatus,
        aiStatus: parsed.normalizedPayload.aiStatus,
        sourceConfidence: parsed.normalizedPayload.sourceConfidence,
        diffSummary: classification.diffSummary,
        reviewNote: workflow.reviewNote,
        approvedBy: null,
        approvedAt: null,
        appliedWordId: null,
        appliedBy: null,
        appliedAt: null,
        errorMessage: classification.errorMessage,
      });
    }

    const effectiveRows = [...createdRows, ...updatedRows];

    const summaryCounts = summarizePreviewRows(
      effectiveRows.map(({ classification, workflow }) => ({
        changeClassification: classification.changeClassification,
        reviewStatus: workflow.reviewStatus,
        applyStatus: workflow.applyStatus,
      })),
    );
    const pendingRows = effectiveRows.filter(
      ({ workflow }) => workflow.reviewStatus === "pending" || workflow.reviewStatus === "needs_review",
    ).length;
    const approvedRows = effectiveRows.filter(({ workflow }) => workflow.reviewStatus === "approved").length;
    const appliedRows = effectiveRows.filter(
      ({ workflow }) => workflow.reviewStatus === "applied" || workflow.applyStatus === "applied" || workflow.applyStatus === "skipped",
    ).length;
    const completedBatch = await updateVocabSyncBatch(batch.id, {
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
        lastCompletedBatchRunAt,
        updatedExistingReviewRows: updatedRows.length,
        updatedExistingReviewRowKeys: updatedRows
          .map(({ parsed }) => parsed.sourceRowKey)
          .filter((value): value is string => Boolean(value)),
        skippedClosedReviewRows: closedRows.length,
        skippedClosedReviewRowKeys: closedRows
          .map(({ parsed }) => parsed.sourceRowKey)
          .filter((value): value is string => Boolean(value)),
        skippedOlderThanLastBatchRows: staleByLastBatchRows.length,
        skippedOlderThanLastBatchRowKeys: staleByLastBatchRows
          .map(({ parsed }) => parsed.sourceRowKey)
          .filter((value): value is string => Boolean(value)),
      },
      completedAt: new Date().toISOString(),
    });

    logger.info("vocab_sync_preview_completed", {
      batchId: completedBatch.id,
      spreadsheetId,
      sheetName: input.sheetName,
      totalRows: parsedRows.length,
      summaryCounts,
      updatedExistingReviewRows: updatedRows.length,
      skippedClosedReviewRows: closedRows.length,
      skippedOlderThanLastBatchRows: staleByLastBatchRows.length,
      lastCompletedBatchRunAt,
    });

    return {
      batch: completedBatch,
      summaryCounts,
    };
  } catch (error) {
    logger.error("vocab_sync_preview_failed", error, {
      batchId: batch.id,
      spreadsheetId,
      sheetName,
    });

    await updateVocabSyncBatch(batch.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      notes: error instanceof Error ? error.message : "Preview sync failed.",
    });

    throw error;
  }
}

export async function getVocabSyncPreviewBatch(batchId: string) {
  return getVocabSyncBatch(batchId);
}

export async function getVocabSyncPreviewRows(
  batchId: string,
  filters: {
    changeType?: "new" | "changed" | "unchanged" | "conflict" | "invalid";
    reviewStatus?: WordReviewStatus;
    applyStatus?: "pending" | "applied" | "failed" | "skipped";
    limit?: number;
  } = {},
) {
  return listVocabSyncRowsForBatch(batchId, filters);
}

export async function getGlobalVocabSyncPreviewRows(
  filters: {
    batchId?: string;
    changeType?: VocabSyncRow["changeClassification"];
    reviewStatuses?: WordReviewStatus[];
    applyStatus?: VocabSyncRow["applyStatus"];
    limit?: number;
  } = {},
) {
  return listVocabSyncRowsGlobal(filters);
}

export async function getRecentVocabSyncPreviewBatches(limit = 20) {
  return listVocabSyncBatches(limit);
}

export async function getVocabSyncStagedRowCounts(batchIds: string[]) {
  return getVocabSyncRowCountsForBatches(batchIds);
}
