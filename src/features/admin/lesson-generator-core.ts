import { z } from "zod";

import type { SourceConfidenceLevel, WordReviewStatus } from "@/types/domain";

export const lessonGeneratorInputSchema = z.object({
  hskLevel: z.number().int().min(1).max(9),
  topicTagSlugs: z.array(z.string().trim().min(1)).default([]),
  targetWordCount: z.number().int().min(5).max(30).default(18),
  excludePublishedLessonWords: z.boolean().default(true),
  includeUnapprovedWords: z.boolean().default(false),
  allowReusedWords: z.boolean().default(false),
});

export type LessonGeneratorInput = z.infer<typeof lessonGeneratorInputSchema>;

export interface LessonGeneratorWord {
  id: string;
  slug: string;
  hanzi: string;
  pinyin: string;
  vietnameseMeaning: string;
  normalizedText: string | null;
  meaningsVi: string | null;
  hskLevel: number;
  partOfSpeech: string | null;
  componentBreakdownJson: unknown;
  ambiguityFlag: boolean;
  sourceConfidence: SourceConfidenceLevel | null;
  reviewStatus: WordReviewStatus;
  isPublished: boolean;
  tagSlugs: string[];
  radicalTokens: string[];
  componentTokens: string[];
  lessonMemberships: Array<{
    lessonId: string;
    lessonTitle: string;
    lessonSlug: string;
    isPublished: boolean;
  }>;
}

export interface GeneratedLessonCandidate {
  wordId: string;
  slug: string;
  hanzi: string;
  pinyin: string;
  vietnameseMeaning: string;
  difficultyScore: number;
  relevanceScore: number;
  selectionReason: string;
  isNewWord: boolean;
  lessonMemberships: LessonGeneratorWord["lessonMemberships"];
  tagSlugs: string[];
  partOfSpeech: string | null;
}

export interface LessonGeneratorPreview {
  selectedWords: GeneratedLessonCandidate[];
  replacementWords: GeneratedLessonCandidate[];
  averageDifficultyScore: number;
}

const COMMON_PARTS_OF_SPEECH = new Map<string, number>([
  ["noun", 0],
  ["danh_tu", 0],
  ["verb", 1],
  ["dong_tu", 1],
  ["pronoun", 1],
  ["dai_tu", 1],
  ["adjective", 2],
  ["tinh_tu", 2],
  ["classifier", 2],
  ["luong_tu", 2],
  ["adverb", 3],
  ["pho_tu", 3],
  ["preposition", 3],
  ["gioi_tu", 3],
]);

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function splitMeaningCount(value: string | null) {
  if (!value) {
    return 1;
  }

  return Math.max(
    1,
    value
      .split(/[;,/\n|]/)
      .map((item) => item.trim())
      .filter(Boolean).length,
  );
}

function countCharacterLength(word: LessonGeneratorWord) {
  const source = word.normalizedText?.trim() || word.hanzi.trim();
  return Math.max(1, Array.from(source).length);
}

function extractComponentTokens(value: unknown): string[] {
  if (!value) {
    return [];
  }

  const tokens = new Set<string>();

  function visit(node: unknown) {
    if (typeof node === "string") {
      const normalized = node.trim();
      if (normalized) {
        tokens.add(normalized);
      }
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }

    if (node && typeof node === "object") {
      for (const property of Object.values(node)) {
        visit(property);
      }
    }
  }

  visit(value);

  return Array.from(tokens);
}

function countComponentComplexity(word: LessonGeneratorWord) {
  const componentCount =
    word.componentTokens.length > 0
      ? word.componentTokens.length
      : extractComponentTokens(word.componentBreakdownJson).length;

  return Math.max(1, componentCount);
}

function getPartOfSpeechWeight(value: string | null) {
  if (!value) {
    return 2;
  }

  return COMMON_PARTS_OF_SPEECH.get(normalizeToken(value)) ?? 2;
}

function getSourceConfidencePenalty(value: SourceConfidenceLevel | null) {
  if (value === "high") return 0;
  if (value === "medium") return 2;
  if (value === "low") return 4;
  return 3;
}

function getReviewStatusPenalty(value: WordReviewStatus) {
  if (value === "approved") return 0;
  if (value === "applied") return 1;
  if (value === "needs_review") return 4;
  if (value === "pending") return 5;
  return 10;
}

export function scoreWordDifficulty(word: LessonGeneratorWord) {
  const score =
    word.hskLevel * 18 +
    countCharacterLength(word) * 6 +
    splitMeaningCount(word.meaningsVi) * 4 +
    countComponentComplexity(word) * 2 +
    getPartOfSpeechWeight(word.partOfSpeech) * 3 +
    getSourceConfidencePenalty(word.sourceConfidence) +
    getReviewStatusPenalty(word.reviewStatus) +
    (word.ambiguityFlag ? 8 : 0);

  return Number(score.toFixed(2));
}

function buildSelectionReason(parts: string[]) {
  return parts.filter(Boolean).join("; ");
}

function countSharedValues(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightSet = new Set(right.map(normalizeToken));
  return left.reduce((count, item) => {
    return count + (rightSet.has(normalizeToken(item)) ? 1 : 0);
  }, 0);
}

function scoreWordRelevance(
  word: LessonGeneratorWord,
  selectedWords: LessonGeneratorWord[],
  input: LessonGeneratorInput,
) {
  const selectedPartOfSpeechCounts = new Map<string, number>();
  const selectedRadicals = new Set<string>();
  const selectedComponents = new Set<string>();

  for (const selectedWord of selectedWords) {
    if (selectedWord.partOfSpeech) {
      const key = normalizeToken(selectedWord.partOfSpeech);
      selectedPartOfSpeechCounts.set(key, (selectedPartOfSpeechCounts.get(key) ?? 0) + 1);
    }

    for (const token of selectedWord.radicalTokens) {
      selectedRadicals.add(normalizeToken(token));
    }

    for (const token of selectedWord.componentTokens) {
      selectedComponents.add(normalizeToken(token));
    }
  }

  const sharedTagCount = countSharedValues(word.tagSlugs, input.topicTagSlugs);
  const sharedRadicalCount = countSharedValues(word.radicalTokens, Array.from(selectedRadicals));
  const sharedComponentCount = countSharedValues(word.componentTokens, Array.from(selectedComponents));
  const normalizedPartOfSpeech = word.partOfSpeech ? normalizeToken(word.partOfSpeech) : "";
  const existingPartOfSpeechCount = normalizedPartOfSpeech
    ? (selectedPartOfSpeechCounts.get(normalizedPartOfSpeech) ?? 0)
    : 0;

  let relevanceScore = 20;
  const reasonParts: string[] = [`HSK ${word.hskLevel} match`];

  if (sharedTagCount > 0) {
    relevanceScore += sharedTagCount * 24;
    reasonParts.push(
      sharedTagCount === 1
        ? "shares 1 selected topic tag"
        : `shares ${sharedTagCount} selected topic tags`,
    );
  }

  if (selectedWords.length === 0) {
    relevanceScore += 8;
    reasonParts.push("seed word for the lesson set");
  } else {
    if (sharedRadicalCount > 0) {
      relevanceScore += Math.min(12, sharedRadicalCount * 4);
      reasonParts.push(
        sharedRadicalCount === 1 ? "shares a radical with selected words" : "shares radicals with selected words",
      );
    }

    if (sharedComponentCount > 0) {
      relevanceScore += Math.min(10, sharedComponentCount * 2);
      reasonParts.push(
        sharedComponentCount === 1
          ? "shares a component with selected words"
          : "shares components with selected words",
      );
    }

    if (normalizedPartOfSpeech) {
      if (existingPartOfSpeechCount === 0) {
        relevanceScore += 8;
        reasonParts.push("adds part-of-speech variety");
      } else if (existingPartOfSpeechCount < 2) {
        relevanceScore += 4;
        reasonParts.push("keeps part-of-speech balance");
      } else {
        relevanceScore -= 3;
      }
    }
  }

  if (word.lessonMemberships.length > 0) {
    relevanceScore -= word.lessonMemberships.length * 3;
    reasonParts.push(
      word.lessonMemberships.length === 1
        ? "already appears in 1 lesson"
        : `already appears in ${word.lessonMemberships.length} lessons`,
    );
  } else {
    relevanceScore += 6;
    reasonParts.push("new to lesson coverage");
  }

  return {
    relevanceScore: Number(relevanceScore.toFixed(2)),
    selectionReason: buildSelectionReason(reasonParts),
  };
}

function stableCandidateSort(
  left: GeneratedLessonCandidate,
  right: GeneratedLessonCandidate,
) {
  if (right.relevanceScore !== left.relevanceScore) {
    return right.relevanceScore - left.relevanceScore;
  }

  if (left.difficultyScore !== right.difficultyScore) {
    return left.difficultyScore - right.difficultyScore;
  }

  if (left.lessonMemberships.length !== right.lessonMemberships.length) {
    return left.lessonMemberships.length - right.lessonMemberships.length;
  }

  return left.slug.localeCompare(right.slug);
}

export function buildLessonGeneratorPreview(
  words: LessonGeneratorWord[],
  input: LessonGeneratorInput,
): LessonGeneratorPreview {
  const eligibleWords = words.filter((word) => {
    if (input.excludePublishedLessonWords && word.lessonMemberships.some((lesson) => lesson.isPublished)) {
      return false;
    }

    if (!input.includeUnapprovedWords && (!word.isPublished || word.reviewStatus !== "approved")) {
      return false;
    }

    if (word.reviewStatus === "rejected") {
      return false;
    }

    if (!word.slug || !word.hanzi || !word.pinyin || !word.vietnameseMeaning || !word.hskLevel) {
      return false;
    }

    if (!word.normalizedText || !word.meaningsVi) {
      return false;
    }

    if (input.topicTagSlugs.length > 0 && countSharedValues(word.tagSlugs, input.topicTagSlugs) === 0) {
      return false;
    }

    return true;
  });

  const preferredWords =
    !input.allowReusedWords && eligibleWords.filter((word) => word.lessonMemberships.length === 0).length >= input.targetWordCount
      ? eligibleWords.filter((word) => word.lessonMemberships.length === 0)
      : eligibleWords;

  const remainingWords = [...preferredWords];
  const selectedSourceWords: LessonGeneratorWord[] = [];
  const selectedWords: GeneratedLessonCandidate[] = [];

  while (selectedWords.length < input.targetWordCount && remainingWords.length > 0) {
    const ranked = remainingWords
      .map((word) => {
        const difficultyScore = scoreWordDifficulty(word);
        const { relevanceScore, selectionReason } = scoreWordRelevance(word, selectedSourceWords, input);

        return {
          sourceWord: word,
          candidate: {
            wordId: word.id,
            slug: word.slug,
            hanzi: word.hanzi,
            pinyin: word.pinyin,
            vietnameseMeaning: word.vietnameseMeaning,
            difficultyScore,
            relevanceScore,
            selectionReason,
            isNewWord: word.lessonMemberships.length === 0,
            lessonMemberships: word.lessonMemberships,
            tagSlugs: word.tagSlugs,
            partOfSpeech: word.partOfSpeech,
          } satisfies GeneratedLessonCandidate,
        };
      })
      .sort((left, right) => stableCandidateSort(left.candidate, right.candidate));

    const next = ranked[0];
    if (!next) {
      break;
    }

    selectedSourceWords.push(next.sourceWord);
    selectedWords.push(next.candidate);

    const nextIndex = remainingWords.findIndex((word) => word.id === next.sourceWord.id);
    if (nextIndex >= 0) {
      remainingWords.splice(nextIndex, 1);
    }
  }

  const replacementWords = remainingWords
    .map((word) => {
      const difficultyScore = scoreWordDifficulty(word);
      const { relevanceScore, selectionReason } = scoreWordRelevance(word, selectedSourceWords, input);

      return {
        wordId: word.id,
        slug: word.slug,
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        vietnameseMeaning: word.vietnameseMeaning,
        difficultyScore,
        relevanceScore,
        selectionReason,
        isNewWord: word.lessonMemberships.length === 0,
        lessonMemberships: word.lessonMemberships,
        tagSlugs: word.tagSlugs,
        partOfSpeech: word.partOfSpeech,
      } satisfies GeneratedLessonCandidate;
    })
    .sort(stableCandidateSort);

  const averageDifficultyScore =
    selectedWords.length === 0
      ? 0
      : Number(
          (
            selectedWords.reduce((total, word) => total + word.difficultyScore, 0) /
            selectedWords.length
          ).toFixed(2),
        );

  return {
    selectedWords: [...selectedWords].sort((left, right) => {
      if (left.difficultyScore !== right.difficultyScore) {
        return left.difficultyScore - right.difficultyScore;
      }

      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore;
      }

      return left.slug.localeCompare(right.slug);
    }),
    replacementWords,
    averageDifficultyScore,
  };
}
