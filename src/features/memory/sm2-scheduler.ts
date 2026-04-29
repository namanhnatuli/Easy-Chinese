import type { SchedulerGrade } from "@/types/domain";

import { DEFAULT_LEARNING_SCHEDULER_SETTINGS, DEFAULT_SM2_SCHEDULER_CONFIG } from "@/features/memory/scheduler-settings";
import type {
  ExistingWordMemorySnapshot,
  LearningSchedulerSettings,
  SchedulerMemoryCard,
  SchedulerStrategy,
  SchedulerTransition,
} from "@/features/memory/scheduler-types";

const ONE_MINUTE_IN_MS = 60 * 1000;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * ONE_MINUTE_IN_MS);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * ONE_DAY_IN_MS);
}

function clampEaseFactor(easeFactor: number) {
  return Math.max(DEFAULT_SM2_SCHEDULER_CONFIG.minimumEaseFactor, Number(easeFactor.toFixed(2)));
}

function clampIntervalDays(intervalDays: number, settings?: LearningSchedulerSettings) {
  const maximum = settings?.maximumIntervalDays ?? DEFAULT_SM2_SCHEDULER_CONFIG.maximumIntervalDays;
  return Math.max(1, Math.min(Math.round(intervalDays), maximum));
}

function getStepsForState(state: SchedulerMemoryCard["state"]) {
  return state === "relearning"
    ? DEFAULT_SM2_SCHEDULER_CONFIG.relearningStepsMinutes
    : DEFAULT_SM2_SCHEDULER_CONFIG.newStepsMinutes;
}

function getHardLearningDelayMinutes(stepMinutes: readonly number[], stepIndex: number) {
  const currentStep = stepMinutes[Math.min(stepIndex, stepMinutes.length - 1)] ?? 1;
  const nextStep = stepMinutes[Math.min(stepIndex + 1, stepMinutes.length - 1)] ?? currentStep;
  return Math.min(nextStep, Math.max(currentStep + 1, Math.round(currentStep * 1.5)));
}

function createSm2DefaultCard(settings: LearningSchedulerSettings = DEFAULT_LEARNING_SCHEDULER_SETTINGS): SchedulerMemoryCard {
  return {
    schedulerType: "sm2",
    state: "new",
    easeFactor: DEFAULT_SM2_SCHEDULER_CONFIG.startingEaseFactor,
    intervalDays: 0,
    dueAt: null,
    reps: 0,
    lapses: 0,
    learningStepIndex: 0,
    fsrsStability: null,
    fsrsDifficulty: null,
    fsrsRetrievability: null,
    scheduledDays: 0,
    elapsedDays: 0,
    lastReviewedAt: null,
    lastGrade: null,
  };
}

function normalizeSm2Card(
  existing: ExistingWordMemorySnapshot | null,
  settings: LearningSchedulerSettings = DEFAULT_LEARNING_SCHEDULER_SETTINGS,
): SchedulerMemoryCard {
  if (!existing) {
    return createSm2DefaultCard(settings);
  }

  return {
    schedulerType: "sm2",
    state: existing.state,
    easeFactor: clampEaseFactor(existing.easeFactor),
    intervalDays: Math.max(existing.intervalDays, 0),
    dueAt: existing.dueAt,
    reps: Math.max(existing.reps, 0),
    lapses: Math.max(existing.lapses, 0),
    learningStepIndex: Math.max(existing.learningStepIndex, 0),
    fsrsStability: existing.fsrsStability ?? null,
    fsrsDifficulty: existing.fsrsDifficulty ?? null,
    fsrsRetrievability: existing.fsrsRetrievability ?? null,
    scheduledDays: Math.max(existing.scheduledDays ?? 0, 0),
    elapsedDays: Math.max(existing.elapsedDays ?? 0, 0),
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
  settings,
}: {
  card: SchedulerMemoryCard;
  now: Date;
  intervalDays: number;
  easeFactor: number;
  grade: SchedulerGrade;
  reps: number;
  settings: LearningSchedulerSettings;
}) {
  return {
    ...card,
    schedulerType: "sm2" as const,
    state: "review" as const,
    easeFactor,
    intervalDays,
    dueAt: addDays(now, intervalDays).toISOString(),
    reps,
    learningStepIndex: 0,
    scheduledDays: intervalDays,
    elapsedDays: Math.max(card.elapsedDays, 0),
    lastReviewedAt: now.toISOString(),
    lastGrade: grade,
    fsrsRetrievability: settings.desiredRetention,
  };
}

export const Sm2Scheduler: SchedulerStrategy = {
  schedulerType: "sm2",
  defaultConfig: DEFAULT_SM2_SCHEDULER_CONFIG,
  createDefaultCard(settings) {
    return createSm2DefaultCard(settings ?? DEFAULT_LEARNING_SCHEDULER_SETTINGS);
  },
  normalize(existing, settings) {
    return normalizeSm2Card(existing, settings ?? DEFAULT_LEARNING_SCHEDULER_SETTINGS);
  },
  applyGrade({ existing, grade, now, settings }): SchedulerTransition {
    const previous = normalizeSm2Card(existing, settings);
    const nextReps = previous.reps + 1;
    const learningState = previous.state === "relearning" ? "relearning" : "learning";
    const activeSteps = getStepsForState(previous.state);

    if (previous.state === "new" || previous.state === "learning" || previous.state === "relearning") {
      const baseStepIndex = previous.state === "new" ? 0 : previous.learningStepIndex;

      if (grade === "again") {
        const resetStep = activeSteps[0] ?? 1;
        return {
          schedulerType: "sm2",
          previous,
          next: {
            ...previous,
            schedulerType: "sm2",
            state: learningState,
            easeFactor: clampEaseFactor(previous.easeFactor - 0.2),
            intervalDays: 0,
            dueAt: addMinutes(now, resetStep).toISOString(),
            reps: nextReps,
            learningStepIndex: 0,
            scheduledDays: 0,
            elapsedDays: 0,
            lastReviewedAt: now.toISOString(),
            lastGrade: grade,
          },
        };
      }

      if (grade === "hard") {
        return {
          schedulerType: "sm2",
          previous,
          next: {
            ...previous,
            schedulerType: "sm2",
            state: learningState,
            easeFactor: clampEaseFactor(previous.easeFactor - 0.15),
            intervalDays: 0,
            dueAt: addMinutes(now, getHardLearningDelayMinutes(activeSteps, baseStepIndex)).toISOString(),
            reps: nextReps,
            learningStepIndex: baseStepIndex,
            scheduledDays: 0,
            elapsedDays: 0,
            lastReviewedAt: now.toISOString(),
            lastGrade: grade,
          },
        };
      }

      if (grade === "easy") {
        const easyInterval =
          previous.state === "relearning"
            ? clampIntervalDays(Math.max(previous.intervalDays, DEFAULT_SM2_SCHEDULER_CONFIG.easyIntervalDays), settings)
            : clampIntervalDays(DEFAULT_SM2_SCHEDULER_CONFIG.easyIntervalDays, settings);

        return {
          schedulerType: "sm2",
          previous,
          next: graduateToReview({
            card: previous,
            now,
            intervalDays: easyInterval,
            easeFactor: clampEaseFactor(previous.easeFactor + 0.15),
            grade,
            reps: nextReps,
            settings,
          }),
        };
      }

      const nextStepIndex = baseStepIndex + 1;
      if (nextStepIndex >= activeSteps.length) {
        const intervalDays =
          previous.state === "relearning"
            ? clampIntervalDays(Math.max(previous.intervalDays, DEFAULT_SM2_SCHEDULER_CONFIG.graduatingIntervalDays), settings)
            : clampIntervalDays(DEFAULT_SM2_SCHEDULER_CONFIG.graduatingIntervalDays, settings);

        return {
          schedulerType: "sm2",
          previous,
          next: graduateToReview({
            card: previous,
            now,
            intervalDays,
            easeFactor: previous.easeFactor,
            grade,
            reps: nextReps,
            settings,
          }),
        };
      }

      return {
        schedulerType: "sm2",
        previous,
        next: {
          ...previous,
          schedulerType: "sm2",
          state: learningState,
          intervalDays: 0,
          dueAt: addMinutes(now, activeSteps[nextStepIndex] ?? activeSteps.at(-1) ?? 1).toISOString(),
          reps: nextReps,
          learningStepIndex: nextStepIndex,
          scheduledDays: 0,
          elapsedDays: 0,
          lastReviewedAt: now.toISOString(),
          lastGrade: grade,
        },
      };
    }

    if (grade === "again") {
      const lapseInterval = clampIntervalDays(
        Math.max(1, Math.round(previous.intervalDays * DEFAULT_SM2_SCHEDULER_CONFIG.lapseIntervalMultiplier)),
        settings,
      );

      return {
        schedulerType: "sm2",
        previous,
        next: {
          ...previous,
          schedulerType: "sm2",
          state: "relearning",
          easeFactor: clampEaseFactor(previous.easeFactor - 0.2),
          intervalDays: lapseInterval,
          dueAt: addMinutes(now, DEFAULT_SM2_SCHEDULER_CONFIG.relearningStepsMinutes[0] ?? 10).toISOString(),
          reps: nextReps,
          lapses: previous.lapses + 1,
          learningStepIndex: 0,
          scheduledDays: lapseInterval,
          elapsedDays: Math.max(previous.scheduledDays || previous.intervalDays, 0),
          lastReviewedAt: now.toISOString(),
          lastGrade: grade,
        },
      };
    }

    if (grade === "hard") {
      const hardInterval = clampIntervalDays(
        Math.max(
          previous.intervalDays + 1,
          previous.intervalDays * DEFAULT_SM2_SCHEDULER_CONFIG.hardIntervalMultiplier * DEFAULT_SM2_SCHEDULER_CONFIG.intervalMultiplier,
        ),
        settings,
      );

      return {
        schedulerType: "sm2",
        previous,
        next: {
          ...previous,
          schedulerType: "sm2",
          state: "review",
          easeFactor: clampEaseFactor(previous.easeFactor - 0.15),
          intervalDays: hardInterval,
          dueAt: addDays(now, hardInterval).toISOString(),
          reps: nextReps,
          learningStepIndex: 0,
          scheduledDays: hardInterval,
          elapsedDays: Math.max(previous.scheduledDays || previous.intervalDays, 0),
          lastReviewedAt: now.toISOString(),
          lastGrade: grade,
          fsrsRetrievability: settings.desiredRetention,
        },
      };
    }

    if (grade === "easy") {
      const nextEaseFactor = clampEaseFactor(previous.easeFactor + 0.15);
      const easyInterval = clampIntervalDays(
        Math.max(
          previous.intervalDays + 1,
          previous.intervalDays * previous.easeFactor * DEFAULT_SM2_SCHEDULER_CONFIG.easyBonus * DEFAULT_SM2_SCHEDULER_CONFIG.intervalMultiplier,
        ),
        settings,
      );

      return {
        schedulerType: "sm2",
        previous,
        next: {
          ...previous,
          schedulerType: "sm2",
          state: "review",
          easeFactor: nextEaseFactor,
          intervalDays: easyInterval,
          dueAt: addDays(now, easyInterval).toISOString(),
          reps: nextReps,
          learningStepIndex: 0,
          scheduledDays: easyInterval,
          elapsedDays: Math.max(previous.scheduledDays || previous.intervalDays, 0),
          lastReviewedAt: now.toISOString(),
          lastGrade: grade,
          fsrsRetrievability: settings.desiredRetention,
        },
      };
    }

    const goodInterval = clampIntervalDays(
      Math.max(
        previous.intervalDays + 1,
        previous.intervalDays * previous.easeFactor * DEFAULT_SM2_SCHEDULER_CONFIG.intervalMultiplier,
      ),
      settings,
    );

    return {
      schedulerType: "sm2",
      previous,
      next: {
        ...previous,
        schedulerType: "sm2",
        state: "review",
        intervalDays: goodInterval,
        dueAt: addDays(now, goodInterval).toISOString(),
        reps: nextReps,
        learningStepIndex: 0,
        scheduledDays: goodInterval,
        elapsedDays: Math.max(previous.scheduledDays || previous.intervalDays, 0),
        lastReviewedAt: now.toISOString(),
        lastGrade: grade,
        fsrsRetrievability: settings.desiredRetention,
      },
    };
  },
};
