import { DEFAULT_FSRS_CONFIG, DEFAULT_LEARNING_SCHEDULER_SETTINGS, DEFAULT_SM2_SCHEDULER_CONFIG } from "@/features/memory/scheduler-settings";
import type {
  ExistingWordMemorySnapshot,
  LearningSchedulerSettings,
  SchedulerMemoryCard,
  SchedulerStrategy,
  SchedulerTransition,
} from "@/features/memory/scheduler-types";
import type { SchedulerGrade } from "@/types/domain";

const ONE_MINUTE_IN_MS = 60 * 1000;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * ONE_MINUTE_IN_MS);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * ONE_DAY_IN_MS);
}

function round(value: number, digits = 4) {
  return Number(value.toFixed(digits));
}

function clampDifficulty(value: number) {
  return round(Math.max(1, Math.min(10, value)), 2);
}

function clampStability(value: number) {
  return round(Math.max(0.1, value));
}

function clampIntervalDays(value: number, settings: LearningSchedulerSettings) {
  return Math.max(1, Math.min(Math.round(value), settings.maximumIntervalDays));
}

function getLearningSteps(state: SchedulerMemoryCard["state"]) {
  return state === "relearning"
    ? DEFAULT_SM2_SCHEDULER_CONFIG.relearningStepsMinutes
    : DEFAULT_SM2_SCHEDULER_CONFIG.newStepsMinutes;
}

function getHardLearningDelayMinutes(stepMinutes: readonly number[], stepIndex: number) {
  const currentStep = stepMinutes[Math.min(stepIndex, stepMinutes.length - 1)] ?? 1;
  const nextStep = stepMinutes[Math.min(stepIndex + 1, stepMinutes.length - 1)] ?? currentStep;
  return Math.min(nextStep, Math.max(currentStep + 1, Math.round(currentStep * 1.5)));
}

function getElapsedDays(now: Date, lastReviewedAt: string | null, fallback: number) {
  if (!lastReviewedAt) {
    return Math.max(0, fallback);
  }

  const elapsed = (now.getTime() - new Date(lastReviewedAt).getTime()) / ONE_DAY_IN_MS;
  return Math.max(0, round(elapsed, 3));
}

function computeRetrievability(stability: number, elapsedDays: number) {
  return round(Math.exp(-elapsedDays / Math.max(stability, 0.1)), 6);
}

function computeIntervalFromStability(stability: number, desiredRetention: number, maximumIntervalDays: number) {
  const unclamped = -Math.log(desiredRetention) * Math.max(stability, 0.1);
  return Math.max(1, Math.min(Math.round(unclamped), maximumIntervalDays));
}

function createFsrsDefaultCard(): SchedulerMemoryCard {
  return {
    schedulerType: "fsrs",
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

function normalizeFsrsCard(existing: ExistingWordMemorySnapshot | null): SchedulerMemoryCard {
  if (!existing) {
    return createFsrsDefaultCard();
  }

  return {
    schedulerType: "fsrs",
    state: existing.state,
    easeFactor: Math.max(DEFAULT_SM2_SCHEDULER_CONFIG.minimumEaseFactor, Number(existing.easeFactor.toFixed(2))),
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

function initialDifficultyForGrade(grade: SchedulerGrade) {
  switch (grade) {
    case "again":
      return 7.4;
    case "hard":
      return 6.4;
    case "good":
      return 5.5;
    case "easy":
      return 4.6;
  }
}

function initialStabilityForGrade(grade: SchedulerGrade) {
  switch (grade) {
    case "again":
      return 0.25;
    case "hard":
      return 0.8;
    case "good":
      return 2.5;
    case "easy":
      return 4.2;
  }
}

function graduateToReview({
  previous,
  now,
  grade,
  settings,
}: {
  previous: SchedulerMemoryCard;
  now: Date;
  grade: SchedulerGrade;
  settings: LearningSchedulerSettings;
}) {
  const difficulty = clampDifficulty(previous.fsrsDifficulty ?? initialDifficultyForGrade(grade));
  const stability = clampStability(previous.fsrsStability ?? initialStabilityForGrade(grade));
  const intervalDays = clampIntervalDays(
    grade === "easy"
      ? Math.max(DEFAULT_SM2_SCHEDULER_CONFIG.easyIntervalDays, computeIntervalFromStability(stability, settings.desiredRetention, settings.maximumIntervalDays))
      : Math.max(DEFAULT_SM2_SCHEDULER_CONFIG.graduatingIntervalDays, computeIntervalFromStability(stability, settings.desiredRetention, settings.maximumIntervalDays)),
    settings,
  );

  return {
    ...previous,
    schedulerType: "fsrs" as const,
    state: "review" as const,
    intervalDays,
    dueAt: addDays(now, intervalDays).toISOString(),
    reps: previous.reps + 1,
    learningStepIndex: 0,
    fsrsStability: stability,
    fsrsDifficulty: difficulty,
    fsrsRetrievability: settings.desiredRetention,
    scheduledDays: intervalDays,
    elapsedDays: 0,
    lastReviewedAt: now.toISOString(),
    lastGrade: grade,
  };
}

export const FsrsScheduler: SchedulerStrategy = {
  schedulerType: "fsrs",
  defaultConfig: DEFAULT_FSRS_CONFIG,
  createDefaultCard() {
    return createFsrsDefaultCard();
  },
  normalize(existing) {
    return normalizeFsrsCard(existing);
  },
  applyGrade({ existing, grade, now, settings }): SchedulerTransition {
    const normalizedSettings = settings ?? DEFAULT_LEARNING_SCHEDULER_SETTINGS;
    const previous = normalizeFsrsCard(existing);
    const activeSteps = getLearningSteps(previous.state);

    if (previous.state === "new" || previous.state === "learning" || previous.state === "relearning") {
      const baseStepIndex = previous.state === "new" ? 0 : previous.learningStepIndex;

      if (grade === "again") {
        return {
          schedulerType: "fsrs",
          previous,
          next: {
            ...previous,
            schedulerType: "fsrs",
            state: previous.state === "relearning" ? "relearning" : "learning",
            dueAt: addMinutes(now, activeSteps[0] ?? 1).toISOString(),
            reps: previous.reps + 1,
            learningStepIndex: 0,
            fsrsDifficulty: clampDifficulty((previous.fsrsDifficulty ?? 6.5) + 0.5),
            fsrsStability: clampStability((previous.fsrsStability ?? 0.4) * 0.7),
            fsrsRetrievability: 1,
            scheduledDays: 0,
            elapsedDays: 0,
            lastReviewedAt: now.toISOString(),
            lastGrade: grade,
          },
        };
      }

      if (grade === "hard") {
        return {
          schedulerType: "fsrs",
          previous,
          next: {
            ...previous,
            schedulerType: "fsrs",
            state: previous.state === "relearning" ? "relearning" : "learning",
            dueAt: addMinutes(now, getHardLearningDelayMinutes(activeSteps, baseStepIndex)).toISOString(),
            reps: previous.reps + 1,
            learningStepIndex: baseStepIndex,
            fsrsDifficulty: clampDifficulty((previous.fsrsDifficulty ?? 6.2) + 0.2),
            fsrsStability: clampStability(previous.fsrsStability ?? initialStabilityForGrade("hard")),
            fsrsRetrievability: 1,
            scheduledDays: 0,
            elapsedDays: 0,
            lastReviewedAt: now.toISOString(),
            lastGrade: grade,
          },
        };
      }

      if (grade === "easy") {
        return {
          schedulerType: "fsrs",
          previous,
          next: graduateToReview({
            previous: {
              ...previous,
              fsrsDifficulty: clampDifficulty((previous.fsrsDifficulty ?? initialDifficultyForGrade("easy")) - 0.3),
              fsrsStability: clampStability(previous.fsrsStability ?? initialStabilityForGrade("easy")),
            },
            now,
            grade,
            settings: normalizedSettings,
          }),
        };
      }

      const nextStepIndex = baseStepIndex + 1;
      if (nextStepIndex >= activeSteps.length) {
        return {
          schedulerType: "fsrs",
          previous,
          next: graduateToReview({
            previous: {
              ...previous,
              fsrsDifficulty: clampDifficulty(previous.fsrsDifficulty ?? initialDifficultyForGrade("good")),
              fsrsStability: clampStability(previous.fsrsStability ?? initialStabilityForGrade("good")),
            },
            now,
            grade,
            settings: normalizedSettings,
          }),
        };
      }

      return {
        schedulerType: "fsrs",
        previous,
        next: {
          ...previous,
          schedulerType: "fsrs",
          state: previous.state === "relearning" ? "relearning" : "learning",
          dueAt: addMinutes(now, activeSteps[nextStepIndex] ?? activeSteps.at(-1) ?? 1).toISOString(),
          reps: previous.reps + 1,
          learningStepIndex: nextStepIndex,
          fsrsDifficulty: clampDifficulty(previous.fsrsDifficulty ?? initialDifficultyForGrade("good")),
          fsrsStability: clampStability(previous.fsrsStability ?? initialStabilityForGrade("good")),
          fsrsRetrievability: 1,
          scheduledDays: 0,
          elapsedDays: 0,
          lastReviewedAt: now.toISOString(),
          lastGrade: grade,
        },
      };
    }

    const previousStability = clampStability(previous.fsrsStability ?? Math.max(previous.intervalDays, 1));
    const previousDifficulty = clampDifficulty(previous.fsrsDifficulty ?? 5.5);
    const elapsedDays = getElapsedDays(now, previous.lastReviewedAt, previous.scheduledDays || previous.intervalDays);
    const retrievability = computeRetrievability(previousStability, elapsedDays);

    if (grade === "again") {
      return {
        schedulerType: "fsrs",
        previous: {
          ...previous,
          fsrsStability: previousStability,
          fsrsDifficulty: previousDifficulty,
          fsrsRetrievability: retrievability,
          elapsedDays,
        },
        next: {
          ...previous,
          schedulerType: "fsrs",
          state: "relearning",
          dueAt: addMinutes(now, DEFAULT_SM2_SCHEDULER_CONFIG.relearningStepsMinutes[0] ?? 10).toISOString(),
          reps: previous.reps + 1,
          lapses: previous.lapses + 1,
          learningStepIndex: 0,
          intervalDays: clampIntervalDays(Math.max(1, Math.round(previous.intervalDays * 0.2)), normalizedSettings),
          fsrsStability: clampStability(previousStability * 0.45),
          fsrsDifficulty: clampDifficulty(previousDifficulty + 0.6),
          fsrsRetrievability: 1,
          scheduledDays: 0,
          elapsedDays: round(elapsedDays, 3),
          lastReviewedAt: now.toISOString(),
          lastGrade: grade,
        },
      };
    }

    const growthBase = Math.max(0.85, 11 - previousDifficulty);
    const hardStability = clampStability(previousStability * (1.03 + growthBase * 0.018 + retrievability * 0.08));
    const goodStability = clampStability(previousStability * (1.16 + growthBase * 0.032 + retrievability * 0.14));
    const easyStability = clampStability(previousStability * (1.3 + growthBase * 0.04 + retrievability * 0.18));

    const nextDifficulty =
      grade === "hard"
        ? clampDifficulty(previousDifficulty + 0.15)
        : grade === "easy"
          ? clampDifficulty(previousDifficulty - 0.2)
          : clampDifficulty(previousDifficulty - 0.05);

    const nextStability = grade === "hard" ? hardStability : grade === "easy" ? easyStability : goodStability;
    const baseGoodInterval = computeIntervalFromStability(
      goodStability,
      normalizedSettings.desiredRetention,
      normalizedSettings.maximumIntervalDays,
    );
    const scheduledDays = clampIntervalDays(
      grade === "hard"
        ? Math.max(
            1,
            computeIntervalFromStability(
              nextStability,
              Math.min(0.97, normalizedSettings.desiredRetention + 0.03),
              normalizedSettings.maximumIntervalDays,
            ),
          )
        : grade === "easy"
          ? Math.max(
              baseGoodInterval + 1,
              Math.round(
                computeIntervalFromStability(
                  nextStability,
                  normalizedSettings.desiredRetention,
                  normalizedSettings.maximumIntervalDays,
                ) * 1.15,
              ),
            )
          : computeIntervalFromStability(
              nextStability,
              normalizedSettings.desiredRetention,
              normalizedSettings.maximumIntervalDays,
            ),
      normalizedSettings,
    );

    return {
      schedulerType: "fsrs",
      previous: {
        ...previous,
        fsrsStability: previousStability,
        fsrsDifficulty: previousDifficulty,
        fsrsRetrievability: retrievability,
        elapsedDays: round(elapsedDays, 3),
      },
      next: {
        ...previous,
        schedulerType: "fsrs",
        state: "review",
        dueAt: addDays(now, scheduledDays).toISOString(),
        reps: previous.reps + 1,
        learningStepIndex: 0,
        intervalDays: scheduledDays,
        fsrsStability: nextStability,
        fsrsDifficulty: nextDifficulty,
        fsrsRetrievability: normalizedSettings.desiredRetention,
        scheduledDays,
        elapsedDays: round(elapsedDays, 3),
        lastReviewedAt: now.toISOString(),
        lastGrade: grade,
      },
    };
  },
};
