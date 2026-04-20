import type { TimestampedEntity } from "@/types/domain";

export type WordSourceConfidence = "low" | "medium" | "high";
export type WordReviewStatus = "pending" | "needs_review" | "approved" | "rejected" | "applied";
export type WordAiStatus = "pending" | "processing" | "done" | "failed" | "skipped";
export type VocabSyncBatchStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type VocabSyncChangeKind = "new" | "changed" | "unchanged" | "conflict" | "invalid";
export type VocabSyncApplyStatus = "pending" | "applied" | "failed" | "skipped";

export interface NormalizedExample {
  chineseText: string;
  pinyin: string | null;
  vietnameseMeaning: string;
  sortOrder: number;
}

export interface NormalizedVocabSyncPayload {
  externalId: string | null;
  inputText: string | null;
  normalizedText: string | null;
  pinyin: string | null;
  meaningsVi: string | null;
  hanViet: string | null;
  traditionalVariant: string | null;
  mainRadicals: string[];
  componentBreakdownJson: unknown;
  radicalSummary: string | null;
  hskLevel: number | null;
  partOfSpeech: string | null;
  topicTags: string[];
  examples: NormalizedExample[];
  similarChars: string[];
  characterStructureType: string | null;
  structureExplanation: string | null;
  mnemonic: string | null;
  notes: string | null;
  sourceConfidence: WordSourceConfidence | null;
  ambiguityFlag: boolean;
  ambiguityNote: string | null;
  readingCandidates: string | null;
  reviewStatus: WordReviewStatus;
  aiStatus: WordAiStatus;
  sourceUpdatedAt: string | null;
}

export interface WordTag extends TimestampedEntity {
  id: string;
  slug: string;
  label: string;
  description: string | null;
}

export interface WordTagLink extends TimestampedEntity {
  wordId: string;
  wordTagId: string;
}

export interface WordRadical extends TimestampedEntity {
  wordId: string;
  radicalId: string;
  isMain: boolean;
  sortOrder: number;
}

export interface VocabSyncBatch extends TimestampedEntity {
  id: string;
  externalSource: string;
  sourceDocumentId: string | null;
  sourceSheetName: string | null;
  sourceSheetGid: string | null;
  status: VocabSyncBatchStatus;
  initiatedBy: string | null;
  rawBatchPayload: Record<string, unknown> | null;
  totalRows: number;
  pendingRows: number;
  approvedRows: number;
  rejectedRows: number;
  appliedRows: number;
  errorRows: number;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface VocabSyncRow extends TimestampedEntity {
  id: string;
  batchId: string;
  externalSource: string;
  externalId: string | null;
  sourceRowKey: string;
  sourceRowNumber: number | null;
  sourceUpdatedAt: string | null;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown>;
  adminEditedPayload: Record<string, unknown> | null;
  contentHash: string | null;
  changeClassification: VocabSyncChangeKind;
  matchResult: string | null;
  matchedWordIds: string[];
  parseErrors: string[];
  reviewStatus: WordReviewStatus;
  aiStatus: WordAiStatus;
  sourceConfidence: WordSourceConfidence | null;
  diffSummary: Record<string, unknown> | null;
  reviewNote: string | null;
  applyStatus: VocabSyncApplyStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  appliedWordId: string | null;
  appliedBy: string | null;
  appliedAt: string | null;
  errorMessage: string | null;
}
