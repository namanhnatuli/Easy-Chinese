import type { MemoryCardState, PracticeEventResult, ReviewResult, SchedulerGrade, SchedulerType } from "@/types/domain";

export interface Sm2SchedulerConfig {
  newStepsMinutes: readonly number[];
  graduatingIntervalDays: number;
  easyIntervalDays: number;
  relearningStepsMinutes: readonly number[];
  minimumEaseFactor: number;
  startingEaseFactor: number;
  easyBonus: number;
  hardIntervalMultiplier: number;
  intervalMultiplier: number;
  lapseIntervalMultiplier: number;
  maximumIntervalDays: number;
}

export interface FsrsSchedulerConfig {
  desiredRetention: number;
  minimumRetention: number;
  maximumRetention: number;
  maximumIntervalDays: number;
  parameters: readonly number[];
}

export interface LearningSchedulerSettings {
  schedulerType: SchedulerType;
  desiredRetention: number;
  maximumIntervalDays: number;
}

export interface ExistingWordMemorySnapshot {
  id?: string;
  senseId?: string | null;
  schedulerType?: SchedulerType;
  state: MemoryCardState;
  easeFactor: number;
  intervalDays: number;
  dueAt: string | null;
  reps: number;
  lapses: number;
  learningStepIndex: number;
  fsrsStability?: number | null;
  fsrsDifficulty?: number | null;
  fsrsRetrievability?: number | null;
  scheduledDays?: number;
  elapsedDays?: number;
  lastReviewedAt: string | null;
  lastGrade: SchedulerGrade | null;
}

export interface SchedulerMemoryCard {
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
}

export interface SchedulerTransition {
  schedulerType: SchedulerType;
  previous: SchedulerMemoryCard;
  next: SchedulerMemoryCard;
}

export interface SchedulerStrategy {
  readonly schedulerType: SchedulerType;
  readonly defaultConfig: Sm2SchedulerConfig | FsrsSchedulerConfig;
  createDefaultCard(settings?: LearningSchedulerSettings): SchedulerMemoryCard;
  normalize(existing: ExistingWordMemorySnapshot | null, settings?: LearningSchedulerSettings): SchedulerMemoryCard;
  applyGrade(args: {
    existing: ExistingWordMemorySnapshot | null;
    grade: SchedulerGrade;
    now: Date;
    settings: LearningSchedulerSettings;
  }): SchedulerTransition;
}

export interface ExistingLearningStatsSnapshot {
  streakCount: number;
  lastActiveDate: string | null;
  dailyGoal: number;
  schedulerType?: SchedulerType;
  desiredRetention?: number;
  maximumIntervalDays?: number;
}

export function mapReviewResultToMemoryGrade(result: ReviewResult): SchedulerGrade {
  switch (result) {
    case "correct":
      return "good";
    case "incorrect":
      return "again";
    case "skipped":
      return "again";
  }
}

export function mapPracticeResultToMemoryGrade(result: PracticeEventResult): SchedulerGrade {
  switch (result) {
    case "completed":
    case "correct":
      return "good";
    case "difficult":
    case "almost":
      return "hard";
    case "skipped":
    case "incorrect":
      return "again";
  }
}
