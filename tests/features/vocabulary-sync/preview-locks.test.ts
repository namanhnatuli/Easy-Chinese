import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveExistingSyncRowAction,
  wasRowUpdatedAfterLastCompletedBatch,
} from "@/features/vocabulary-sync/preview-locks";
import type { VocabSyncRow } from "@/features/vocabulary-sync/types";

function createOpenSyncRow(overrides: Partial<VocabSyncRow> = {}): VocabSyncRow {
  return {
    id: "sync-row-1",
    batchId: "batch-1",
    externalSource: "google_sheets",
    externalId: null,
    sourceRowKey: "打电话::dǎ diànhuà::dong_tu",
    sourceRowNumber: 2,
    sourceUpdatedAt: "2026-04-20T00:00:00.000Z",
    rawPayload: {},
    normalizedPayload: {},
    adminEditedPayload: null,
    contentHash: "hash-1",
    changeClassification: "changed",
    matchResult: "source_row_key",
    matchedWordIds: ["word-1"],
    parseErrors: [],
    reviewStatus: "pending",
    aiStatus: "done",
    sourceConfidence: "high",
    diffSummary: null,
    reviewNote: null,
    applyStatus: "pending",
    approvedBy: null,
    approvedAt: null,
    appliedWordId: null,
    appliedBy: null,
    appliedAt: null,
    errorMessage: null,
    createdAt: "2026-04-20T00:00:00.000Z",
    updatedAt: "2026-04-20T00:00:00.000Z",
    ...overrides,
  };
}

test("existing pending row is updated in place", () => {
  assert.equal(resolveExistingSyncRowAction(createOpenSyncRow()), "update");
});

test("approved and rejected rows are skipped instead of restaged", () => {
  assert.equal(
    resolveExistingSyncRowAction(createOpenSyncRow({ reviewStatus: "approved" })),
    "skip_closed",
  );
  assert.equal(
    resolveExistingSyncRowAction(createOpenSyncRow({ reviewStatus: "rejected" })),
    "skip_closed",
  );
});

test("missing existing row creates a new sync row", () => {
  assert.equal(resolveExistingSyncRowAction(null), "create");
});

test("rows updated after the last completed batch are eligible for restaging", () => {
  assert.equal(
    wasRowUpdatedAfterLastCompletedBatch(
      "2026-04-20T10:00:00.000Z",
      "2026-04-20T09:00:00.000Z",
    ),
    true,
  );
});

test("rows not newer than the last completed batch are skipped", () => {
  assert.equal(
    wasRowUpdatedAfterLastCompletedBatch(
      "2026-04-20T09:00:00.000Z",
      "2026-04-20T09:00:00.000Z",
    ),
    false,
  );
});
