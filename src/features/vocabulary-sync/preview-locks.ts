import type { VocabSyncRow } from "@/features/vocabulary-sync/types";

export function shouldSkipRestagingForExistingOpenRow(
  sourceRowKey: string,
  existingOpenRows: Map<string, VocabSyncRow>,
) {
  return existingOpenRows.has(sourceRowKey);
}

export function wasRowUpdatedAfterLastCompletedBatch(
  sourceUpdatedAt: string | null,
  lastCompletedBatchRunAt: string | null,
) {
  if (!sourceUpdatedAt || !lastCompletedBatchRunAt) {
    return true;
  }

  const sourceUpdatedAtValue = Date.parse(sourceUpdatedAt);
  const lastCompletedBatchRunAtValue = Date.parse(lastCompletedBatchRunAt);

  if (Number.isNaN(sourceUpdatedAtValue) || Number.isNaN(lastCompletedBatchRunAtValue)) {
    return true;
  }

  return sourceUpdatedAtValue > lastCompletedBatchRunAtValue;
}

export type ExistingSyncRowAction = "create" | "update" | "skip_closed";

export function resolveExistingSyncRowAction(existingRow: VocabSyncRow | null | undefined): ExistingSyncRowAction {
  if (!existingRow) {
    return "create";
  }

  if (existingRow.reviewStatus === "pending" || existingRow.reviewStatus === "needs_review") {
    return "update";
  }

  return "skip_closed";
}
