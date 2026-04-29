import type {
  MemoryCardState,
  PracticeEventResult,
  ReviewResult,
  SchedulerGrade,
  UserLearningStats,
} from "@/types/domain";

const ONE_MINUTE_IN_MS = 60 * 1000;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface SchedulerConfig {
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

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  newStepsMinutes: [1, 10],
  graduatingIntervalDays: 1,
  easyIntervalDays: 4,
  relearningStepsMinutes: [10],
  minimumEaseFactor: 1.3,
  startingEaseFactor: 2.5,
  easyBonus: 1.3,
  hardIntervalMultiplier: 1.2,
  intervalMultiplier: 1.0,
  lapseIntervalMultiplier: 0.0,
  maximumIntervalDays: 36500,
};

const DEFAULT_DAILY_GOAL = 10;

export interface ExistingWordMemorySnapshot {
  state: MemoryCardState;
  easeFactor: number;
  intervalDays: number;
  dueAt: string | null;
  reps: number;
  lapses: number;
  learningStepIndex: number;
  lastReviewedAt: string | null;
  lastGrade: SchedulerGrade | null;
}

export interface ExistingLearningStatsSnapshot {
  streakCount: number;
  lastActiveDate: string | null;
  dailyGoal: number;
}

export interface SchedulerMemoryCard {
  state: MemoryCardState;
  easeFactor: number;
  intervalDays: number;
  dueAt: string | null;
  reps: number;
  lapses: number;
  learningStepIndex: number;
  lastReviewedAt: string | null;
  lastGrade: SchedulerGrade | null;
}

export interface SchedulerTransition {
  previous: SchedulerMemoryCard;
  next: SchedulerMemoryCard;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatUtcDate(date: Date) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * ONE_MINUTE_IN_MS);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * ONE_DAY_IN_MS);
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function diffUtcDays(left: Date, right: Date) {
  return Math.floor((startOfUtcDay(left).getTime() - startOfUtcDay(right).getTime()) / ONE_DAY_IN_MS);
}

function getStepsForState(state: MemoryCardState, config: SchedulerConfig) {
  return state === "relearning" ? config.relearningStepsMinutes : config.newStepsMinutes;
}

function getHardLearningDelayMinutes(stepMinutes: readonly number[], stepIndex: number) {
  const currentStep = stepMinutes[Math.min(stepIndex, stepMinutes.length - 1)] ?? 1;
  const nextStep = stepMinutes[Math.min(stepIndex + 1, stepMinutes.length - 1)] ?? currentStep;
  return Math.min(nextStep, Math.max(currentStep + 1, Math.round(currentStep * 1.5)));
}

function clampEaseFactor(easeFactor: number, config: SchedulerConfig) {
  return Math.max(config.minimumEaseFactor, Number(easeFactor.toFixed(2)));
}

function clampIntervalDays(intervalDays: number, config: SchedulerConfig) {
  return Math.max(1, Math.min(Math.round(intervalDays), config.maximumIntervalDays));
}

function scheduleReviewInterval(now: Date, intervalDays: number) {
  return addDays(now, intervalDays).toISOString();
}

export function createDefaultMemoryCard(config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG): SchedulerMemoryCard {
  return {
    state: "new",
    easeFactor: config.startingEaseFactor,
    intervalDays: 0,
    dueAt: null,
    reps: 0,
    lapses: 0,
    learningStepIndex: 0,
    lastReviewedAt: null,
    lastGrade: null,
  };
}

export function normalizeMemoryCard(
  existing: ExistingWordMemorySnapshot | null,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
): SchedulerMemoryCard {
  if (!existing) {
    return createDefaultMemoryCard(config);
  }

  return {
    state: existing.state,
    easeFactor: clampEaseFactor(existing.easeFactor, config),
    intervalDays: Math.max(existing.intervalDays, 0),
    dueAt: existing.dueAt,
    reps: Math.max(existing.reps, 0),
    lapses: Math.max(existing.lapses, 0),
    learningStepIndex: Math.max(existing.learningStepIndex, 0),
    lastReviewedAt: existing.lastReviewedAt,
    lastGrade: existing.lastGrade,
  };
}

function graduateToReview({
  card,
  now,
  intervalDays,
  easeFactor,
  grade,
  reps,
}: {
  card: SchedulerMemoryCard;
  now: Date;
  intervalDays: number;
  easeFactor: number;
  grade: SchedulerGrade;
  reps: number;
}): SchedulerMemoryCard {
  return {
    ...card,
    state: "review",
    easeFactor,
    intervalDays,
    dueAt: scheduleReviewInterval(now, intervalDays),
    reps,
    learningStepIndex: 0,
    lastReviewedAt: now.toISOString(),
    lastGrade: grade,
  };
}

export function applySchedulerGrade({
  existing,
  grade,
  now,
  config = DEFAULT_SCHEDULER_CONFIG,
}: {
  existing: ExistingWordMemorySnapshot | null;
  grade: SchedulerGrade;
  now: Date;
  config?: SchedulerConfig;
}): SchedulerTransition {
  const previous = normalizeMemoryCard(existing, config);
  const nextReps = previous.reps + 1;
  const learningState = previous.state === "relearning" ? "relearning" : "learning";
  const activeSteps = getStepsForState(previous.state, config);

  if (previous.state === "new" || previous.state === "learning" || previous.state === "relearning") {
    const baseStepIndex = previous.state === "new" ? 0 : previous.learningStepIndex;

    if (grade === "again") {
      const resetStep = activeSteps[0] ?? 1;
      return {
        previous,
        next: {
          ...previous,
          state: learningState,
          easeFactor: clampEaseFactor(previous.easeFactor - 0.2, config),
          dueAt: addMinutes(now, resetStep).toISOString(),
          reps: nextReps,
          learningStepIndex: 0,
          lastReviewedAt: now.toISOString(),
          lastGrade: grade,
        },
      };
    }

    if (grade === "hard") {
      return {
        previous,
        next: {
          ...previous,
          state: learningState,
          easeFactor: clampEaseFactor(previous.easeFactor - 0.15, config),
          dueAt: addMinutes(now, getHardLearningDelayMinutes(activeSteps, baseStepIndex)).toISOString(),
          reps: nextReps,
          learningStepIndex: baseStepIndex,
          lastReviewedAt: now.toISOString(),
          lastGrade: grade,
        },
      };
    }

    if (grade === "easy") {
      const easyInterval =
        previous.state === "relearning"
          ? clampIntervalDays(Math.max(previous.intervalDays, config.easyIntervalDays), config)
          : clampIntervalDays(config.easyIntervalDays, config);

      return {
        previous,
        next: graduateToReview({
          card: previous,
          now,
          intervalDays: easyInterval,
          easeFactor: clampEaseFactor(previous.easeFactor + 0.15, config),
          grade,
          reps: nextReps,
        }),
      };
    }

    const nextStepIndex = baseStepIndex + 1;
    if (nextStepIndex >= activeSteps.length) {
      const intervalDays =
        previous.state === "relearning"
          ? clampIntervalDays(Math.max(previous.intervalDays, config.graduatingIntervalDays), config)
          : clampIntervalDays(config.graduatingIntervalDays, config);

      return {
        previous,
        next: graduateToReview({
          card: previous,
          now,
          intervalDays,
          easeFactor: previous.easeFactor,
          grade,
          reps: nextReps,
        }),
      };
    }

    return {
      previous,
      next: {
        ...previous,
        state: learningState,
        dueAt: addMinutes(now, activeSteps[nextStepIndex] ?? activeSteps.at(-1) ?? 1).toISOString(),
        reps: nextReps,
        learningStepIndex: nextStepIndex,
        lastReviewedAt: now.toISOString(),
        lastGrade: grade,
      },
    };
  }

  if (grade === "again") {
    const lapseInterval = clampIntervalDays(
      Math.max(1, Math.round(previous.intervalDays * config.lapseIntervalMultiplier)),
      config,
    );

    return {
      previous,
      next: {
        ...previous,
        state: "relearning",
        easeFactor: clampEaseFactor(previous.easeFactor - 0.2, config),
        intervalDays: lapseInterval,
        dueAt: addMinutes(now, config.relearningStepsMinutes[0] ?? 10).toISOString(),
        reps: nextReps,
        lapses: previous.lapses + 1,
        learningStepIndex: 0,
        lastReviewedAt: now.toISOString(),
        lastGrade: grade,
      },
    };
  }

  if (grade === "hard") {
    const hardInterval = clampIntervalDays(
      Math.max(previous.intervalDays + 1, previous.intervalDays * config.hardIntervalMultiplier * config.intervalMultiplier),
      config,
    );

    return {
      previous,
      next: {
        ...previous,
        state: "review",
        easeFactor: clampEaseFactor(previous.easeFactor - 0.15, config),
        intervalDays: hardInterval,
        dueAt: scheduleReviewInterval(now, hardInterval),
        reps: nextReps,
        learningStepIndex: 0,
        lastReviewedAt: now.toISOString(),
        lastGrade: grade,
      },
    };
  }

  if (grade === "easy") {
    const nextEaseFactor = clampEaseFactor(previous.easeFactor + 0.15, config);
    const easyInterval = clampIntervalDays(
      Math.max(previous.intervalDays + 1, previous.intervalDays * previous.easeFactor * config.easyBonus * config.intervalMultiplier),
      config,
    );

    return {
      previous,
      next: {
        ...previous,
        state: "review",
        easeFactor: nextEaseFactor,
        intervalDays: easyInterval,
        dueAt: scheduleReviewInterval(now, easyInterval),
        reps: nextReps,
        learningStepIndex: 0,
        lastReviewedAt: now.toISOString(),
        lastGrade: grade,
      },
    };
  }

  const goodInterval = clampIntervalDays(
    Math.max(previous.intervalDays + 1, previous.intervalDays * previous.easeFactor * config.intervalMultiplier),
    config,
  );

  return {
    previous,
    next: {
      ...previous,
      state: "review",
      intervalDays: goodInterval,
      dueAt: scheduleReviewInterval(now, goodInterval),
      reps: nextReps,
      learningStepIndex: 0,
      lastReviewedAt: now.toISOString(),
      lastGrade: grade,
    },
  };
}

export function buildWordMemoryPatch(
  existing: ExistingWordMemorySnapshot | null,
  grade: SchedulerGrade,
  now: Date,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
) {
  const transition = applySchedulerGrade({
    existing,
    grade,
    now,
    config,
  });

  return {
    state: transition.next.state,
    ease_factor: Number(transition.next.easeFactor.toFixed(2)),
    interval_days: transition.next.intervalDays,
    due_at: transition.next.dueAt,
    reps: transition.next.reps,
    lapses: transition.next.lapses,
    learning_step_index: transition.next.learningStepIndex,
    last_reviewed_at: transition.next.lastReviewedAt,
    last_grade: transition.next.lastGrade,
  };
}

export function predictDueHintsForGrades(
  existing: ExistingWordMemorySnapshot | null,
  now: Date,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
) {
  return {
    again: formatDueHint(applySchedulerGrade({ existing, grade: "again", now, config }).next.dueAt, now),
    hard: formatDueHint(applySchedulerGrade({ existing, grade: "hard", now, config }).next.dueAt, now),
    good: formatDueHint(applySchedulerGrade({ existing, grade: "good", now, config }).next.dueAt, now),
    easy: formatDueHint(applySchedulerGrade({ existing, grade: "easy", now, config }).next.dueAt, now),
  };
}

export function formatDueHint(dueAt: string | null, now: Date) {
  if (!dueAt) {
    return "now";
  }

  const diffMs = new Date(dueAt).getTime() - now.getTime();
  if (diffMs <= 0) {
    return "now";
  }

  const minutes = Math.ceil(diffMs / ONE_MINUTE_IN_MS);
  if (minutes < 10) {
    return "< 10m";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.ceil(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.ceil(hours / 24);
  return `${days}d`;
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
      return "good";
    case "difficult":
      return "hard";
    case "skipped":
      return "again";
  }
}

export function mapMemoryGradeToPracticeResult(grade: SchedulerGrade): PracticeEventResult {
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

export function getVisibleStreakCount(
  stats: Pick<UserLearningStats, "lastActiveDate" | "streakCount"> | ExistingLearningStatsSnapshot | null,
  now: Date,
) {
  if (!stats?.lastActiveDate) {
    return 0;
  }

  const diffDays = diffUtcDays(now, parseDateOnly(stats.lastActiveDate));
  return diffDays <= 1 ? stats.streakCount : 0;
}

export function buildLearningStatsPatch({
  existing,
  completedToday,
  now,
}: {
  existing: ExistingLearningStatsSnapshot | null;
  completedToday: number;
  now: Date;
}) {
  const dailyGoal = existing?.dailyGoal ?? DEFAULT_DAILY_GOAL;
  const today = formatUtcDate(now);
  const visibleStreakCount = getVisibleStreakCount(existing, now);

  if (completedToday < dailyGoal) {
    return {
      streak_count: visibleStreakCount,
      last_active_date: existing?.lastActiveDate ?? null,
      daily_goal: dailyGoal,
    };
  }

  if (existing?.lastActiveDate === today) {
    return {
      streak_count: existing.streakCount,
      last_active_date: existing.lastActiveDate,
      daily_goal: dailyGoal,
    };
  }

  const previousDate = existing?.lastActiveDate ? parseDateOnly(existing.lastActiveDate) : null;
  const nextStreakCount =
    previousDate && diffUtcDays(now, previousDate) === 1 ? visibleStreakCount + 1 : 1;

  return {
    streak_count: nextStreakCount,
    last_active_date: today,
    daily_goal: dailyGoal,
  };
}

export function getDefaultDailyGoal() {
  return DEFAULT_DAILY_GOAL;
}
