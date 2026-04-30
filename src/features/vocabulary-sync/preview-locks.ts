import type { VocabSyncRow } from "@/features/vocabulary-sync/types";

export function shouldSkipRestagingForExistingOpenRow(
  sourceRowKey: string,
  existingOpenRows: Map<string, VocabSyncRow>,
) {
  return existingOpenRows.has(sourceRowKey);
}

export function isRowStaleComparedToExisting(
  currentSourceUpdatedAt: string | null | undefined,
  existingSourceUpdatedAt: string | null | undefined,
) {
  if (!currentSourceUpdatedAt || !existingSourceUpdatedAt) {
    return false;
  }

  const currentValue = Date.parse(currentSourceUpdatedAt);
  const existingValue = Date.parse(existingSourceUpdatedAt);

  if (Number.isNaN(currentValue) || Number.isNaN(existingValue)) {
    return false;
  }

  return currentValue <= existingValue;
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
