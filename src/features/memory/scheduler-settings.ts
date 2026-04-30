import type { LearningSchedulerSettings, Sm2SchedulerConfig, FsrsSchedulerConfig } from "@/features/memory/scheduler-types";

export const DEFAULT_DAILY_GOAL = 10;

export const DEFAULT_SM2_SCHEDULER_CONFIG: Sm2SchedulerConfig = {
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

export const DEFAULT_FSRS_PARAMETERS = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34,
  1.26, 0.29, 2.61,
] as const;

export const DEFAULT_FSRS_CONFIG: FsrsSchedulerConfig = {
  desiredRetention: 0.9,
  minimumRetention: 0.7,
  maximumRetention: 0.99,
  maximumIntervalDays: 36500,
  parameters: DEFAULT_FSRS_PARAMETERS,
};

export const DEFAULT_LEARNING_SCHEDULER_SETTINGS: LearningSchedulerSettings = {
  schedulerType: "fsrs",
  desiredRetention: DEFAULT_FSRS_CONFIG.desiredRetention,
  maximumIntervalDays: DEFAULT_FSRS_CONFIG.maximumIntervalDays,
};

export function clampDesiredRetention(value: number) {
  const normalized = Number.isFinite(value) ? value : DEFAULT_FSRS_CONFIG.desiredRetention;
  return Math.min(
    DEFAULT_FSRS_CONFIG.maximumRetention,
    Math.max(DEFAULT_FSRS_CONFIG.minimumRetention, Number(normalized.toFixed(2))),
  );
}

export function clampMaximumIntervalDays(value: number) {
  const normalized = Number.isFinite(value) ? Math.round(value) : DEFAULT_FSRS_CONFIG.maximumIntervalDays;
  return Math.min(DEFAULT_FSRS_CONFIG.maximumIntervalDays, Math.max(1, normalized));
}

export function normalizeLearningSchedulerSettings(
  value: Partial<LearningSchedulerSettings> | null | undefined,
): LearningSchedulerSettings {
  return {
    schedulerType: value?.schedulerType === "sm2" ? "sm2" : "fsrs",
    desiredRetention: clampDesiredRetention(value?.desiredRetention ?? DEFAULT_LEARNING_SCHEDULER_SETTINGS.desiredRetention),
    maximumIntervalDays: clampMaximumIntervalDays(value?.maximumIntervalDays ?? DEFAULT_LEARNING_SCHEDULER_SETTINGS.maximumIntervalDays),
  };
}
