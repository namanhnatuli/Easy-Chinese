import assert from "node:assert/strict";
import test from "node:test";

import {
  derivePreviewWorkflowState,
  summarizePreviewRows,
} from "@/features/vocabulary-sync/preview-summary";

test("derivePreviewWorkflowState auto-skips unchanged rows", () => {
  const result = derivePreviewWorkflowState({
    changeClassification: "unchanged",
    errorMessage: null,
    parseErrors: [],
    diffSummary: {
      matchedWordId: "word-1",
    },
  });

  assert.deepEqual(result, {
    reviewStatus: "applied",
    applyStatus: "skipped",
    reviewNote:
      "Skipped during preview because the staged content hash already matches the production word.",
  });
});

test("derivePreviewWorkflowState keeps conflict rows in manual review", () => {
  const result = derivePreviewWorkflowState({
    changeClassification: "conflict",
    errorMessage: "Multiple production words matched.",
    parseErrors: [],
    diffSummary: {
      guidance: "Compare pinyin and part of speech before approving.",
    },
  });

  assert.deepEqual(result, {
    reviewStatus: "needs_review",
    applyStatus: "pending",
    reviewNote: "Compare pinyin and part of speech before approving.",
  });
});

test("summarizePreviewRows separates approved and applied totals", () => {
  const result = summarizePreviewRows([
    {
      changeClassification: "new",
      reviewStatus: "approved",
      applyStatus: "pending",
    },
    {
      changeClassification: "unchanged",
      reviewStatus: "applied",
      applyStatus: "skipped",
    },
    {
      changeClassification: "changed",
      reviewStatus: "pending",
      applyStatus: "pending",
    },
  ]);

  assert.deepEqual(result, {
    new: 1,
    changed: 1,
    unchanged: 1,
    conflict: 0,
    invalid: 0,
    approved: 1,
    applied: 1,
  });
});
