import type {
  MemoryCardState,
  PracticeEventResult,
  PracticeEventType,
  PracticeProgressStatus,
  ReadingPracticeType,
  SchedulerGrade,
  SchedulerType,
} from "@/types/domain";

export interface ReadingProgressSnapshot {
  id: string;
  status: PracticeProgressStatus;
  attemptCount: number;
  lastPracticedAt: string | null;
}

export interface WritingProgressSnapshot {
  id: string;
  status: PracticeProgressStatus;
  attemptCount: number;
  lastPracticedAt: string | null;
}

export interface ReadingPracticeWordItem {
  kind: "word";
  id: string;
  slug: string;
  hanzi: string;
  simplified: string;
  pinyin: string;
  vietnameseMeaning: string;
  hskLevel: number;
  progress: ReadingProgressSnapshot | null;
  memory: {
    schedulerType: SchedulerType;
    state: MemoryCardState;
    easeFactor: number;
    intervalDays: number;
    dueAt: string | null;
    reps: number;
    lapses: number;
    learningStepIndex: number;
    fsrsStability: number | null;
    fsrsDifficulty: number | null;
    fsrsRetrievability: number | null;
    scheduledDays: number;
    elapsedDays: number;
    lastReviewedAt: string | null;
    lastGrade: SchedulerGrade | null;
  } | null;
}

export interface ReadingPracticeSentenceItem {
  kind: "sentence";
  id: string;
  chineseText: string;
  pinyin: string | null;
  vietnameseMeaning: string;
  sortOrder: number;
  linkedWord: {
    id: string;
    slug: string;
    hanzi: string;
    pinyin: string;
    vietnameseMeaning: string;
    hskLevel: number;
  } | null;
  progress: ReadingProgressSnapshot | null;
  memory: ReadingPracticeWordItem["memory"];
}

export type ReadingPracticeItem = ReadingPracticeWordItem | ReadingPracticeSentenceItem;

export interface WritingPracticeCharacterItem {
  character: string;
  status: PracticeProgressStatus;
  attemptCount: number;
  lastPracticedAt: string | null;
}

export interface WritingPracticeWordListItem {
  id: string;
  slug: string;
  hanzi: string;
  pinyin: string;
  vietnameseMeaning: string;
  hskLevel: number;
  characterCount: number;
  difficultCharacters: number;
  completedCharacters: number;
  totalAttempts: number;
  lastPracticedAt: string | null;
}

export interface WritingPracticeWordDetail {
  id: string;
  slug: string;
  hanzi: string;
  simplified: string;
  pinyin: string;
  vietnameseMeaning: string;
  hskLevel: number;
  memory: ReadingPracticeWordItem["memory"];
  characters: WritingPracticeCharacterItem[];
}

export interface PracticeDashboardSummary {
  readingCompletedCount: number;
  difficultReadingCount: number;
  writingCharactersPracticed: number;
  difficultWritingCount: number;
  listeningCompletedCount: number;
  listeningAttempts: number;
  listeningAccuracy: number;
  listeningDifficultCount: number;
  listeningTodayCount: number;
  listeningBySourceType: Record<"word" | "example" | "article" | "custom", number>;
}

export interface RecentPracticeActivityItem {
  id: string;
  createdAt: string;
  practiceType: PracticeEventType;
  result: PracticeEventResult;
  word: {
    id: string;
    slug: string;
    hanzi: string;
    pinyin: string;
    vietnameseMeaning: string;
  } | null;
  sentence: {
    id: string;
    chineseText: string;
    vietnameseMeaning: string;
  } | null;
  listening: {
    id: string;
    chineseText: string;
    sourceType: "word" | "example" | "article" | "custom";
    characterCount: number;
    score: number | null;
    hintUsed: boolean;
  } | null;
}

export interface ReadingPracticeMutationInput {
  practiceType: ReadingPracticeType;
  wordId?: string;
  exampleId?: string;
  grade: SchedulerGrade;
}

export interface WritingPracticeMutationInput {
  wordId: string;
  character: string;
  grade: SchedulerGrade;
}
