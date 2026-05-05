import type {
  VocabSyncApplyStatus,
  VocabSyncBatchStatus,
  VocabSyncChangeKind,
  WordAiStatus,
  WordReviewStatus,
  WordSourceConfidence,
} from "@/features/vocabulary-sync/types";
import type { TimestampedEntity } from "@/types/domain";

export type GrammarSyncMatchResult = "slug" | "source_row_key" | "title_structure" | "none" | "conflict";

export interface NormalizedGrammarExample {
  chineseText: string;
  pinyin: string | null;
  vietnameseMeaning: string | null;
  sortOrder: number;
}

export interface NormalizedGrammarSyncPayload {
  title: string;
  slug: string;
  structureText: string;
  explanationVi: string;
  notes: string | null;
  examples: NormalizedGrammarExample[];
  hskLevel: number | null;
  sourceConfidence: WordSourceConfidence | null;
  ambiguityFlag: boolean;
  ambiguityNote: string | null;
  reviewStatus: WordReviewStatus;
  aiStatus: WordAiStatus;
  sourceUpdatedAt: string | null;
}

export interface ParsedGrammarSyncRow {
  rowNumber: number;
  rawPayload: Record<string, string>;
  normalizedPayload: NormalizedGrammarSyncPayload;
  sourceRowKey: string;
  contentHash: string;
  parseErrors: string[];
  initialChangeClassification?: VocabSyncChangeKind;
}

export interface ExistingGrammarSnapshot {
  id: string;
  title: string;
  slug: string;
  structureText: string;
  explanationVi: string;
  notes: string | null;
  examples: NormalizedGrammarExample[];
  hskLevel: number;
  sourceConfidence: WordSourceConfidence | null;
  ambiguityFlag: boolean;
  ambiguityNote: string | null;
  reviewStatus: WordReviewStatus;
  aiStatus: WordAiStatus;
  sourceRowKey: string | null;
  contentHash: string | null;
  lastSourceUpdatedAt: string | null;
}

export interface GrammarSyncBatch extends TimestampedEntity {
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

export interface GrammarSyncRow extends TimestampedEntity {
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
  matchResult: GrammarSyncMatchResult | null;
  matchedGrammarIds: string[];
  parseErrors: string[];
  reviewStatus: WordReviewStatus;
  aiStatus: WordAiStatus;
  sourceConfidence: WordSourceConfidence | null;
  diffSummary: Record<string, unknown> | null;
  reviewNote: string | null;
  applyStatus: VocabSyncApplyStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  appliedGrammarId: string | null;
  appliedBy: string | null;
  appliedAt: string | null;
  errorMessage: string | null;
}
