import "server-only";

import { buildWordContentHash } from "@/features/vocabulary-sync/content-hash";
import type { ParsedVocabSyncRow } from "@/features/vocabulary-sync/normalize";
import type { VocabSyncChangeKind, WordAiStatus, WordReviewStatus, WordSourceConfidence } from "@/features/vocabulary-sync/types";

interface ExistingWordExample {
  chineseText: string;
  pinyin: string | null;
  vietnameseMeaning: string;
  sortOrder: number;
}

export interface ExistingWordPreviewSnapshot {
  id: string;
  slug: string;
  externalSource: string | null;
  externalId: string | null;
  sourceRowKey: string | null;
  contentHash: string | null;
  normalizedText: string | null;
  simplified: string;
  hanzi: string;
  pinyin: string | null;
  partOfSpeech: string | null;
  meaningsVi: string | null;
  hanViet: string | null;
  traditionalVariant: string | null;
  hskLevel: number | null;
  componentBreakdownJson: unknown;
  radicalSummary: string | null;
  mnemonic: string | null;
  characterStructureType: string | null;
  structureExplanation: string | null;
  notes: string | null;
  ambiguityFlag: boolean;
  ambiguityNote: string | null;
  readingCandidates: string | null;
  reviewStatus: WordReviewStatus;
  aiStatus: WordAiStatus;
  sourceConfidence: WordSourceConfidence | null;
  lastSourceUpdatedAt: string | null;
  mainRadicals: string[];
  topicTags: string[];
  examples: ExistingWordExample[];
}

export interface ClassifiedVocabSyncRow {
  sourceRowKey: string;
  changeClassification: VocabSyncChangeKind;
  matchResult: string | null;
  matchedWordIds: string[];
  diffSummary: Record<string, unknown> | null;
  errorMessage: string | null;
}

export interface ResolvedVocabSyncMatch {
  matchResult: "external_id" | "source_row_key" | "normalized_text" | "none" | "conflict";
  candidates: ExistingWordPreviewSnapshot[];
}

function normalizeComparableText(value: string | null) {
  return value?.normalize("NFKC").replace(/\s+/g, " ").trim() ?? null;
}

function createExistingWordHash(word: ExistingWordPreviewSnapshot) {
  return buildWordContentHash({
    normalizedText: word.normalizedText ?? word.simplified ?? word.hanzi,
    pinyin: word.pinyin,
    meaningsVi: word.meaningsVi,
    hanViet: word.hanViet,
    traditionalVariant: word.traditionalVariant,
    hskLevel: word.hskLevel,
    partOfSpeech: word.partOfSpeech,
    componentBreakdownJson: word.componentBreakdownJson,
    radicalSummary: word.radicalSummary,
    mnemonic: word.mnemonic,
    characterStructureType: word.characterStructureType,
    structureExplanation: word.structureExplanation,
    notes: word.notes,
    ambiguityFlag: word.ambiguityFlag,
    ambiguityNote: word.ambiguityNote,
    readingCandidates: word.readingCandidates,
    mainRadicals: word.mainRadicals,
    topicTags: word.topicTags,
    examples: word.examples
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((example) => ({
        chineseText: example.chineseText,
        pinyin: example.pinyin,
        vietnameseMeaning: example.vietnameseMeaning,
      })),
  });
}

function isSourceRowStale(row: ParsedVocabSyncRow, word: ExistingWordPreviewSnapshot) {
  if (!row.normalizedPayload.sourceUpdatedAt || !word.lastSourceUpdatedAt) {
    return false;
  }

  const sourceUpdatedAt = Date.parse(row.normalizedPayload.sourceUpdatedAt);
  const lastSourceUpdatedAt = Date.parse(word.lastSourceUpdatedAt);

  if (Number.isNaN(sourceUpdatedAt) || Number.isNaN(lastSourceUpdatedAt)) {
    return false;
  }

  return sourceUpdatedAt <= lastSourceUpdatedAt;
}

function summarizeDiff(row: ParsedVocabSyncRow, word: ExistingWordPreviewSnapshot) {
  const before = {
    normalizedText: word.normalizedText ?? word.simplified ?? word.hanzi,
    pinyin: word.pinyin,
    meaningsVi: word.meaningsVi,
    hanViet: word.hanViet,
    traditionalVariant: word.traditionalVariant,
    hskLevel: word.hskLevel,
    partOfSpeech: word.partOfSpeech,
    mainRadicals: word.mainRadicals,
    topicTags: word.topicTags,
    examples: word.examples
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((example) => ({
        chineseText: example.chineseText,
        pinyin: example.pinyin,
        vietnameseMeaning: example.vietnameseMeaning,
      })),
    componentBreakdownJson: word.componentBreakdownJson,
    radicalSummary: word.radicalSummary,
    characterStructureType: word.characterStructureType,
    structureExplanation: word.structureExplanation,
    mnemonic: word.mnemonic,
    notes: word.notes,
    ambiguityFlag: word.ambiguityFlag,
    ambiguityNote: word.ambiguityNote,
    readingCandidates: word.readingCandidates,
    reviewStatus: word.reviewStatus,
    aiStatus: word.aiStatus,
    sourceConfidence: word.sourceConfidence,
  };

  const after = {
    normalizedText: row.normalizedPayload.normalizedText,
    pinyin: row.normalizedPayload.pinyin,
    meaningsVi: row.normalizedPayload.meaningsVi,
    hanViet: row.normalizedPayload.hanViet,
    traditionalVariant: row.normalizedPayload.traditionalVariant,
    hskLevel: row.normalizedPayload.hskLevel,
    partOfSpeech: row.normalizedPayload.partOfSpeech,
    mainRadicals: row.normalizedPayload.mainRadicals,
    topicTags: row.normalizedPayload.topicTags,
    examples: row.normalizedPayload.examples.map((example) => ({
      chineseText: example.chineseText,
      pinyin: example.pinyin,
      vietnameseMeaning: example.vietnameseMeaning,
    })),
    componentBreakdownJson: row.normalizedPayload.componentBreakdownJson,
    radicalSummary: row.normalizedPayload.radicalSummary,
    characterStructureType: row.normalizedPayload.characterStructureType,
    structureExplanation: row.normalizedPayload.structureExplanation,
    mnemonic: row.normalizedPayload.mnemonic,
    notes: row.normalizedPayload.notes,
    ambiguityFlag: row.normalizedPayload.ambiguityFlag,
    ambiguityNote: row.normalizedPayload.ambiguityNote,
    readingCandidates: row.normalizedPayload.readingCandidates,
    reviewStatus: row.normalizedPayload.reviewStatus,
    aiStatus: row.normalizedPayload.aiStatus,
    sourceConfidence: row.normalizedPayload.sourceConfidence,
  };

  const changedFields = Object.keys(after).filter((key) => JSON.stringify(before[key as keyof typeof before]) !== JSON.stringify(after[key as keyof typeof after]));

  return {
    matchedWordId: word.id,
    matchedWordSlug: word.slug,
    identity: {
      sourceRowKey: word.sourceRowKey,
      externalId: word.externalId,
      sourceUpdatedAt: row.normalizedPayload.sourceUpdatedAt,
      existingLastSourceUpdatedAt: word.lastSourceUpdatedAt,
    },
    changedFields,
    changedFieldCount: changedFields.length,
    before,
    after,
  };
}

function narrowCandidates(row: ParsedVocabSyncRow, candidates: ExistingWordPreviewSnapshot[]) {
  if (candidates.length <= 1) {
    return candidates;
  }

  const normalizedPinyin = normalizeComparableText(row.normalizedPayload.pinyin)?.toLowerCase();
  if (normalizedPinyin) {
    const pinyinMatches = candidates.filter(
      (candidate) => normalizeComparableText(candidate.pinyin)?.toLowerCase() === normalizedPinyin,
    );

    if (pinyinMatches.length > 0) {
      candidates = pinyinMatches;
    }
  }

  if (candidates.length <= 1) {
    return candidates;
  }

  const normalizedPartOfSpeech = normalizeComparableText(row.normalizedPayload.partOfSpeech)?.toLowerCase();
  if (normalizedPartOfSpeech) {
    const posMatches = candidates.filter(
      (candidate) => normalizeComparableText(candidate.partOfSpeech)?.toLowerCase() === normalizedPartOfSpeech,
    );

    if (posMatches.length > 0) {
      candidates = posMatches;
    }
  }

  return candidates;
}

export function resolveVocabSyncMatch(
  row: ParsedVocabSyncRow,
  words: ExistingWordPreviewSnapshot[],
): ResolvedVocabSyncMatch {
  if (row.normalizedPayload.externalId) {
    const externalMatches = words.filter(
      (word) =>
        word.externalSource === "google_sheets" &&
        word.externalId === row.normalizedPayload.externalId,
    );

    if (externalMatches.length > 0) {
      return {
        matchResult: externalMatches.length > 1 ? "conflict" : "external_id",
        candidates: externalMatches,
      };
    }
  }

  if (row.sourceRowKey) {
    const sourceRowKeyMatches = words.filter(
      (word) =>
        word.externalSource === "google_sheets" &&
        word.sourceRowKey === row.sourceRowKey,
    );

    if (sourceRowKeyMatches.length > 0) {
      return {
        matchResult: sourceRowKeyMatches.length > 1 ? "conflict" : "source_row_key",
        candidates: sourceRowKeyMatches,
      };
    }
  }

  const normalizedText = row.normalizedPayload.normalizedText;
  if (!normalizedText) {
    return {
      matchResult: "none",
      candidates: [],
    };
  }

  const normalizedTextMatches = words.filter((word) => {
    const candidateText = word.normalizedText ?? word.simplified ?? word.hanzi;
    return normalizeComparableText(candidateText) === normalizedText;
  });

  const narrowedCandidates = narrowCandidates(row, normalizedTextMatches);

  return {
    matchResult:
      narrowedCandidates.length === 0
        ? "none"
        : narrowedCandidates.length > 1
          ? "conflict"
          : "normalized_text",
    candidates: narrowedCandidates,
  };
}

export function classifyVocabSyncRow(
  row: ParsedVocabSyncRow,
  words: ExistingWordPreviewSnapshot[],
): ClassifiedVocabSyncRow {
  if (row.parseErrors.length > 0) {
    return {
      sourceRowKey: row.sourceRowKey,
      changeClassification: "invalid",
      matchResult: "parse_error",
      matchedWordIds: [],
      diffSummary: null,
      errorMessage: row.parseErrors.join(" "),
    };
  }

  const resolvedMatch = resolveVocabSyncMatch(row, words);
  const candidates = resolvedMatch.candidates;

  if (candidates.length === 0) {
    return {
      sourceRowKey: row.sourceRowKey,
      changeClassification: "new",
      matchResult: "no_match",
      matchedWordIds: [],
      diffSummary: null,
      errorMessage: null,
    };
  }

  if (candidates.length > 1) {
    return {
      sourceRowKey: row.sourceRowKey,
      changeClassification: "conflict",
      matchResult: "multiple_matches",
      matchedWordIds: candidates.map((candidate) => candidate.id),
      diffSummary: {
        candidateCount: candidates.length,
        guidance:
          "Multiple words share the same normalized text. Use pinyin, part of speech, and source identity to choose the correct reading entry.",
        candidates: candidates.map((candidate) => ({
          id: candidate.id,
          slug: candidate.slug,
          normalizedText: candidate.normalizedText ?? candidate.simplified ?? candidate.hanzi,
          pinyin: candidate.pinyin,
          partOfSpeech: candidate.partOfSpeech,
          sourceRowKey: candidate.sourceRowKey,
          externalId: candidate.externalId,
          lastSourceUpdatedAt: candidate.lastSourceUpdatedAt,
        })),
      },
      errorMessage:
        "Multiple existing words matched this source row. Review pinyin, part of speech, and source identity before approving.",
    };
  }

  const [matchedWord] = candidates;
  if (isSourceRowStale(row, matchedWord)) {
    return {
      sourceRowKey: row.sourceRowKey,
      changeClassification: "unchanged",
      matchResult: resolvedMatch.matchResult,
      matchedWordIds: [matchedWord.id],
      diffSummary: {
        matchedWordId: matchedWord.id,
        matchedWordSlug: matchedWord.slug,
        reason: "stale_source_timestamp",
        sourceUpdatedAt: row.normalizedPayload.sourceUpdatedAt,
        existingLastSourceUpdatedAt: matchedWord.lastSourceUpdatedAt,
      },
      errorMessage: null,
    };
  }

  const existingContentHash = matchedWord.contentHash ?? createExistingWordHash(matchedWord);

  if (row.contentHash && row.contentHash === existingContentHash) {
    return {
      sourceRowKey: row.sourceRowKey,
      changeClassification: "unchanged",
      matchResult: resolvedMatch.matchResult,
      matchedWordIds: [matchedWord.id],
      diffSummary: {
        matchedWordId: matchedWord.id,
        matchedWordSlug: matchedWord.slug,
        reason: "matching_content_hash",
        sourceUpdatedAt: row.normalizedPayload.sourceUpdatedAt,
        existingLastSourceUpdatedAt: matchedWord.lastSourceUpdatedAt,
      },
      errorMessage: null,
    };
  }

  return {
    sourceRowKey: row.sourceRowKey,
    changeClassification: "changed",
    matchResult: resolvedMatch.matchResult,
    matchedWordIds: [matchedWord.id],
    diffSummary: summarizeDiff(row, matchedWord),
    errorMessage: null,
  };
}
