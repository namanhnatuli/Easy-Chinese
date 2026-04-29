import { DEFAULT_DAILY_GOAL, DEFAULT_LEARNING_SCHEDULER_SETTINGS, normalizeLearningSchedulerSettings } from "@/features/memory/scheduler-settings";
import { FsrsScheduler } from "@/features/memory/fsrs-scheduler";
import { Sm2Scheduler } from "@/features/memory/sm2-scheduler";
import type {
  ExistingLearningStatsSnapshot,
  ExistingWordMemorySnapshot,
  LearningSchedulerSettings,
  SchedulerStrategy,
  SchedulerTransition,
} from "@/features/memory/scheduler-types";
import type { SchedulerGrade, UserLearningStats } from "@/types/domain";

const ONE_MINUTE_IN_MS = 60 * 1000;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatUtcDate(date: Date) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function diffUtcDays(left: Date, right: Date) {
  return Math.floor((startOfUtcDay(left).getTime() - startOfUtcDay(right).getTime()) / ONE_DAY_IN_MS);
}

export function resolveLearningSchedulerSettings(
  existing: ExistingWordMemorySnapshot | null,
  settings?: Partial<LearningSchedulerSettings> | null,
) {
  const normalized = normalizeLearningSchedulerSettings(settings);
  if (settings?.schedulerType) {
    return normalized;
  }

  if (existing?.schedulerType === "fsrs") {
    return {
      ...normalized,
      schedulerType: "fsrs" as const,
    };
  }

  return normalized;
}

export function getSchedulerStrategy(
  existing: ExistingWordMemorySnapshot | null,
  settings?: Partial<LearningSchedulerSettings> | null,
): SchedulerStrategy {
  const resolved = resolveLearningSchedulerSettings(existing, settings);
  return resolved.schedulerType === "fsrs" ? FsrsScheduler : Sm2Scheduler;
}

export function createDefaultMemoryCard(settings?: Partial<LearningSchedulerSettings> | null) {
  const resolved = normalizeLearningSchedulerSettings(settings);
  return getSchedulerStrategy(null, resolved).createDefaultCard(resolved);
}

export function normalizeMemoryCard(
  existing: ExistingWordMemorySnapshot | null,
  settings?: Partial<LearningSchedulerSettings> | null,
) {
  const resolved = resolveLearningSchedulerSettings(existing, settings);
  return getSchedulerStrategy(existing, resolved).normalize(existing, resolved);
}

export function applySchedulerGrade({
  existing,
  grade,
  now,
  settings,
}: {
  existing: ExistingWordMemorySnapshot | null;
  grade: SchedulerGrade;
  now: Date;
  settings?: Partial<LearningSchedulerSettings> | null;
}): SchedulerTransition {
  const resolved = resolveLearningSchedulerSettings(existing, settings);
  return getSchedulerStrategy(existing, resolved).applyGrade({
    existing,
    grade,
    now,
    settings: resolved,
  });
}

export function buildWordMemoryPatch(
  existing: ExistingWordMemorySnapshot | null,
  grade: SchedulerGrade,
  now: Date,
  settings?: Partial<LearningSchedulerSettings> | null,
) {
  const transition = applySchedulerGrade({
    existing,
    grade,
    now,
    settings,
  });

  return {
    scheduler_type: transition.next.schedulerType,
    state: transition.next.state,
    ease_factor: Number(transition.next.easeFactor.toFixed(2)),
    interval_days: transition.next.intervalDays,
    due_at: transition.next.dueAt,
    reps: transition.next.reps,
    lapses: transition.next.lapses,
    learning_step_index: transition.next.learningStepIndex,
    fsrs_stability: transition.next.fsrsStability,
    fsrs_difficulty: transition.next.fsrsDifficulty,
    fsrs_retrievability: transition.next.fsrsRetrievability,
    scheduled_days: transition.next.scheduledDays,
    elapsed_days: Math.max(0, Math.round(transition.next.elapsedDays)),
    last_reviewed_at: transition.next.lastReviewedAt,
    last_grade: transition.next.lastGrade,
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

export function predictDueHintsForGrades(
  existing: ExistingWordMemorySnapshot | null,
  now: Date,
  settings?: Partial<LearningSchedulerSettings> | null,
) {
  return {
    again: formatDueHint(applySchedulerGrade({ existing, grade: "again", now, settings }).next.dueAt, now),
    hard: formatDueHint(applySchedulerGrade({ existing, grade: "hard", now, settings }).next.dueAt, now),
    good: formatDueHint(applySchedulerGrade({ existing, grade: "good", now, settings }).next.dueAt, now),
    easy: formatDueHint(applySchedulerGrade({ existing, grade: "easy", now, settings }).next.dueAt, now),
  };
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
  const resolvedSettings = normalizeLearningSchedulerSettings({
    schedulerType: existing?.schedulerType ?? DEFAULT_LEARNING_SCHEDULER_SETTINGS.schedulerType,
    desiredRetention: existing?.desiredRetention ?? DEFAULT_LEARNING_SCHEDULER_SETTINGS.desiredRetention,
    maximumIntervalDays: existing?.maximumIntervalDays ?? DEFAULT_LEARNING_SCHEDULER_SETTINGS.maximumIntervalDays,
  });
  const dailyGoal = existing?.dailyGoal ?? DEFAULT_DAILY_GOAL;
  const today = formatUtcDate(now);
  const visibleStreakCount = getVisibleStreakCount(existing, now);

  if (completedToday < dailyGoal) {
    return {
      streak_count: visibleStreakCount,
      last_active_date: visibleStreakCount > 0 ? existing?.lastActiveDate ?? null : null,
      daily_goal: dailyGoal,
      scheduler_type: resolvedSettings.schedulerType,
      desired_retention: resolvedSettings.desiredRetention,
      maximum_interval_days: resolvedSettings.maximumIntervalDays,
    };
  }

  const previousDate = existing?.lastActiveDate;
  const nextStreakCount =
    previousDate === today
      ? Math.max(existing?.streakCount ?? 0, 1)
      : previousDate && diffUtcDays(now, parseDateOnly(previousDate)) === 1
        ? (existing?.streakCount ?? 0) + 1
        : 1;

  return {
    streak_count: nextStreakCount,
    last_active_date: today,
    daily_goal: dailyGoal,
    scheduler_type: resolvedSettings.schedulerType,
    desired_retention: resolvedSettings.desiredRetention,
    maximum_interval_days: resolvedSettings.maximumIntervalDays,
  };
}

export function getDefaultDailyGoal() {
  return DEFAULT_DAILY_GOAL;
}
