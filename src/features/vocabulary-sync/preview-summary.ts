import type { VocabSyncChangeKind, VocabSyncRow, WordReviewStatus } from "@/features/vocabulary-sync/types";

interface PreviewWorkflowInput {
  changeClassification: VocabSyncChangeKind;
  errorMessage: string | null;
  parseErrors: string[];
  diffSummary: Record<string, unknown> | null;
}

export interface PreviewWorkflowState {
  reviewStatus: WordReviewStatus;
  applyStatus: VocabSyncRow["applyStatus"];
  reviewNote: string | null;
}

export interface PreviewBatchSummary {
  new: number;
  changed: number;
  unchanged: number;
  conflict: number;
  invalid: number;
  approved: number;
  applied: number;
}

function getConflictGuidance(diffSummary: Record<string, unknown> | null) {
  if (!diffSummary) {
    return null;
  }

  const guidance = diffSummary.guidance;
  return typeof guidance === "string" && guidance.trim().length > 0 ? guidance : null;
}

export function derivePreviewWorkflowState(input: PreviewWorkflowInput): PreviewWorkflowState {
  if (input.changeClassification === "unchanged") {
    return {
      reviewStatus: "applied",
      applyStatus: "skipped",
      reviewNote: "Skipped during preview because the staged content hash already matches the production word.",
    };
  }

  if (input.changeClassification === "conflict") {
    return {
      reviewStatus: "needs_review",
      applyStatus: "pending",
      reviewNote:
        getConflictGuidance(input.diffSummary) ??
        input.errorMessage ??
        "Resolve the match ambiguity before approving this row.",
    };
  }

  if (input.changeClassification === "invalid") {
    return {
      reviewStatus: "needs_review",
      applyStatus: "pending",
      reviewNote:
        input.parseErrors[0] ??
        input.errorMessage ??
        "This row has validation issues and cannot be approved until they are fixed.",
    };
  }

  return {
    reviewStatus: "pending",
    applyStatus: "pending",
    reviewNote: null,
  };
}

export function summarizePreviewRows(
  rows: Array<{
    changeClassification: VocabSyncChangeKind;
    reviewStatus: WordReviewStatus;
    applyStatus: VocabSyncRow["applyStatus"];
  }>,
): PreviewBatchSummary {
  return rows.reduce<PreviewBatchSummary>(
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
    },
  );
}
