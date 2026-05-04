import type { PracticeProgressStatus } from "@/types/domain";

export type ListeningDifficulty = "easy" | "medium" | "hard" | "very-hard";
export type ListeningDifficultyFilter = "all" | "easy" | "medium" | "hard";
export type ListeningSourceType = "word" | "example" | "article" | "custom";
export type ListeningSourceTypeFilter = "all" | ListeningSourceType;
export type ListeningDictationResult = "correct" | "almost" | "incorrect";

export interface ListeningSourceMetadata {
  wordId?: string | null;
  senseId?: string | null;
  wordSlug?: string | null;
  articleId?: string | null;
  articleSlug?: string | null;
  articleTitle?: string | null;
  lessonId?: string | null;
  pinyin?: string | null;
  vietnameseMeaning?: string | null;
  generatedBy?: string | null;
}

export interface ListeningProgressSnapshot {
  id: string;
  status: PracticeProgressStatus;
  attemptCount: number;
  correctCount: number;
  almostCount: number;
  incorrectCount: number;
  skippedCount: number;
  bestScore: number;
  lastInput: string | null;
  lastPracticedAt: string | null;
}

export interface ListeningHintState {
  firstCharacterRevealed: boolean;
  pinyinRevealed: boolean;
}

export interface ListeningPracticeItem {
  id: string;
  chineseText: string;
  textPreview: string;
  sourceText: string;
  sourceType: ListeningSourceType;
  sourceRefId: string | null;
  sourceMetadata: ListeningSourceMetadata | null;
  pinyin: string | null;
  vietnameseMeaning: string | null;
  audioUrl: string;
  cacheKey: string;
  provider: "azure" | "google";
  voice: string;
  languageCode: string;
  mimeType: string;
  characterCount: number;
  difficulty: ListeningDifficulty;
  linkedWord: {
    id: string;
    slug: string;
    hanzi: string;
    pinyin: string;
    vietnameseMeaning: string;
    hskLevel: number;
  } | null;
  linkedArticle: {
    id: string;
    slug: string;
    title: string;
  } | null;
  progress: ListeningProgressSnapshot | null;
  createdAt: string;
  lastAccessedAt: string | null;
}

export interface ListeningSessionSummary {
  correct: number;
  almost: number;
  incorrect: number;
  skipped: number;
}

export interface ListeningPracticeMutationInput {
  ttsAudioCacheId: string;
  answer: string;
  hintUsed: boolean;
  skipped?: boolean;
}

export interface ListeningEvaluationDiff {
  distance: number;
  expectedLength: number;
  answerLength: number;
}

export interface ListeningEvaluationResult {
  result: ListeningDictationResult;
  score: number;
  normalizedExpected: string;
  normalizedAnswer: string;
  diff?: ListeningEvaluationDiff;
}

export interface ListeningPersistedOutcome {
  result: ListeningDictationResult | "skipped";
  score: number;
  expectedText: string;
  normalizedExpected: string;
  normalizedAnswer: string;
}
