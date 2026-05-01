export {
  applySchedulerGrade,
  buildLearningStatsPatch,
  buildWordMemoryPatch,
  createDefaultMemoryCard,
  formatDueHint,
  getDefaultDailyGoal,
  getVisibleStreakCount,
  normalizeMemoryCard,
  predictDueHintsForGrades,
  resolveLearningSchedulerSettings,
} from "@/features/memory/scheduler-service";
export {
  DEFAULT_DAILY_GOAL,
  DEFAULT_FSRS_CONFIG,
  DEFAULT_FSRS_PARAMETERS,
  DEFAULT_LEARNING_SCHEDULER_SETTINGS,
  DEFAULT_SM2_SCHEDULER_CONFIG,
  clampDesiredRetention,
  clampMaximumIntervalDays,
  normalizeLearningSchedulerSettings,
} from "@/features/memory/scheduler-settings";
export {
  mapPracticeResultToMemoryGrade,
  mapReviewResultToMemoryGrade,
  type ExistingLearningStatsSnapshot,
  type ExistingWordMemorySnapshot,
  type FsrsSchedulerConfig,
  type LearningSchedulerSettings,
  type SchedulerMemoryCard,
  type SchedulerTransition,
  type Sm2SchedulerConfig,
} from "@/features/memory/scheduler-types";

import type { ReviewResult, SchedulerGrade } from "@/types/domain";

export function mapMemoryGradeToPracticeResult(grade: SchedulerGrade): "completed" | "difficult" | "skipped" {
  switch (grade) {
    case "again":
      return "skipped";
    case "hard":
      return "difficult";
    case "good":
    case "easy":
      return "completed";
  }
}

export function mapMemoryGradeToReviewResult(grade: SchedulerGrade): ReviewResult {
  switch (grade) {
    case "again":
      return "incorrect";
    case "hard":
    case "good":
    case "easy":
      return "correct";
  }
}
