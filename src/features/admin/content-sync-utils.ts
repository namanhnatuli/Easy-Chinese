import { examplesToTextarea } from "@/features/admin/shared-utils";
import type {
  NormalizedVocabSyncPayload,
  VocabSyncBatch,
  VocabSyncRow,
  WordAiStatus,
  WordReviewStatus,
  WordSourceConfidence,
} from "@/features/vocabulary-sync/types";

export interface ContentSyncFilters {
  batchId: string | null;
  q: string;
  changeType: VocabSyncRow["changeClassification"] | "all";
  reviewStatus: WordReviewStatus | "all";
  applyStatus: VocabSyncRow["applyStatus"] | "all";
  selectedRowId: string | null;
  view: "queue" | "resolved";
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

export function splitPipeDelimited(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseBooleanValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

export function normalizeOptionalText(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}


export function buildContentSyncPath(filters: {
  batchId?: string | null;
  view?: string | null;
  q?: string | null;
  changeType?: string | null;
  reviewStatus?: string | null;
  applyStatus?: string | null;
  selectedRowId?: string | null;
  error?: string | null;
}) {
  const params = new URLSearchParams();

  if (filters.batchId) params.set("batch", filters.batchId);
  if (filters.q) params.set("q", filters.q);
  if (filters.changeType && filters.changeType !== "all") params.set("changeType", filters.changeType);
  if (filters.reviewStatus && filters.reviewStatus !== "all") params.set("reviewStatus", filters.reviewStatus);
  if (filters.applyStatus && filters.applyStatus !== "all") params.set("applyStatus", filters.applyStatus);
  if (filters.view && filters.view !== "queue") params.set("view", filters.view);
  if (filters.selectedRowId) params.set("row", filters.selectedRowId);
  if (filters.error) params.set("error", filters.error);

  const query = params.toString();
  return query ? `/admin/content-sync?${query}` : "/admin/content-sync";
}

export function getEditablePayload(row: VocabSyncRow) {
  if (!row || (!row.adminEditedPayload && !row.normalizedPayload)) {
    return {} as Record<string, unknown>;
  }
  return (row.adminEditedPayload ?? row.normalizedPayload) as Record<string, unknown>;
}

export function getEditablePayloadForForm(row: VocabSyncRow) {
  const payload = getEditablePayload(row);
  const examples = payload && Array.isArray(payload.examples)
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
    examples: examples,
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
        ? (payload.sourceConfidence as WordSourceConfidence)
        : ("" as any),
    ambiguityFlag: payload.ambiguityFlag === true,
    ambiguityNote: typeof payload.ambiguityNote === "string" ? payload.ambiguityNote : "",
    readingCandidates: typeof payload.readingCandidates === "string" ? payload.readingCandidates : "",
    reviewStatus:
      payload.reviewStatus === "pending" ||
      payload.reviewStatus === "needs_review" ||
      payload.reviewStatus === "approved" ||
      payload.reviewStatus === "rejected" ||
      payload.reviewStatus === "applied"
        ? (payload.reviewStatus as WordReviewStatus)
        : row.reviewStatus,
    aiStatus:
      payload.aiStatus === "pending" ||
      payload.aiStatus === "processing" ||
      payload.aiStatus === "done" ||
      payload.aiStatus === "failed" ||
      payload.aiStatus === "skipped"
        ? (payload.aiStatus as WordAiStatus)
        : row.aiStatus,
    sourceUpdatedAt: typeof payload.sourceUpdatedAt === "string" ? payload.sourceUpdatedAt : "",
    reviewNote: row.reviewNote ?? "",
  };
}

export function parseSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function parseContentSyncFilters(searchParams: Record<string, string | string[] | undefined>): ContentSyncFilters {
  const viewParam = parseSearchParam(searchParams.view);
  const view: "queue" | "resolved" = viewParam === "resolved" ? "resolved" : "queue";

  const changeType = parseSearchParam(searchParams.changeType);
  const reviewStatusParam = parseSearchParam(searchParams.reviewStatus);
  const applyStatus = parseSearchParam(searchParams.applyStatus);

  // Default review status based on view if not explicitly provided
  let reviewStatus: WordReviewStatus | "all" = "all";
  if (reviewStatusParam) {
    if (
      ["pending", "needs_review", "approved", "rejected", "applied"].includes(
        reviewStatusParam,
      )
    ) {
      reviewStatus = reviewStatusParam as WordReviewStatus;
    }
  }

  return {
    batchId: parseSearchParam(searchParams.batch) || null,
    view,
    q: parseSearchParam(searchParams.q).trim(),
    changeType:
      changeType === "new" ||
      changeType === "changed" ||
      changeType === "unchanged" ||
      changeType === "conflict" ||
      changeType === "invalid"
        ? (changeType as VocabSyncRow["changeClassification"])
        : "all",
    reviewStatus,
    applyStatus:
      applyStatus === "pending" ||
      applyStatus === "applied" ||
      applyStatus === "failed" ||
      applyStatus === "skipped"
        ? (applyStatus as VocabSyncRow["applyStatus"])
        : "all",
    selectedRowId: parseSearchParam(searchParams.row) || null,
  };
}

export function filterSyncRows(rows: VocabSyncRow[], filters: ContentSyncFilters) {
  const needle = filters.q.toLowerCase();

  return rows.filter((row) => {
    if (filters.changeType !== "all" && row.changeClassification !== filters.changeType) {
      return false;
    }

    if (filters.reviewStatus !== "all") {
      if (row.reviewStatus !== filters.reviewStatus) {
        return false;
      }
    } else {
      // Handle the "all" case for specific views
      if (filters.view === "queue") {
        // Queue shows pending/needs_review
        if (row.reviewStatus === "approved" || row.reviewStatus === "rejected" || row.reviewStatus === "applied") {
          return false;
        }
      } else if (filters.view === "resolved") {
        // Resolved shows approved/rejected/applied
        if (row.reviewStatus === "pending" || row.reviewStatus === "needs_review") {
          return false;
        }
      }
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

export function summarizeRows(rows: VocabSyncRow[]): ContentSyncSummary {
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
