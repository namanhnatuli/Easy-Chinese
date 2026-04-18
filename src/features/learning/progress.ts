import type { ProgressStatus, ReviewResult } from "@/types/domain";

const intervalProgression = [1, 3, 7, 14, 30] as const;

export interface ExistingWordProgressSnapshot {
  status: ProgressStatus;
  correctCount: number;
  incorrectCount: number;
  streakCount: number;
  intervalDays: number;
  easeFactor: number;
}

function clampIntervalDay(value: number | null | undefined) {
  return intervalProgression.includes((value ?? 1) as (typeof intervalProgression)[number])
    ? (value ?? 1)
    : 1;
}

export function getNextIntervalDays(
  result: ReviewResult,
  currentIntervalDays: number | null | undefined,
) {
  const intervalDays = clampIntervalDay(currentIntervalDays);

  if (result === "incorrect") {
    return 1;
  }

  if (result === "skipped") {
    return intervalDays;
  }

  const currentIndex = intervalProgression.indexOf(intervalDays as (typeof intervalProgression)[number]);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  return intervalProgression[Math.min(safeIndex + 1, intervalProgression.length - 1)];
}

export function calculateNextReviewAt(
  now: Date,
  intervalDays: number,
) {
  return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
}

export function deriveProgressStatus(
  result: ReviewResult,
  previousStatus: ProgressStatus | null,
  nextIntervalDays: number,
  nextStreakCount: number,
): ProgressStatus {
  if (result === "incorrect") {
    return "learning";
  }

  if (result === "skipped") {
    return previousStatus ?? "new";
  }

  if (nextIntervalDays >= 30 && nextStreakCount >= 4) {
    return "mastered";
  }

  if (nextIntervalDays >= 7 || nextStreakCount >= 2) {
    return "review";
  }

  return "learning";
}

export function buildWordProgressPatch(
  existing: ExistingWordProgressSnapshot | null,
  result: ReviewResult,
  now: Date,
) {
  const currentIntervalDays = existing?.intervalDays ?? 1;
  const nextIntervalDays = getNextIntervalDays(result, currentIntervalDays);
  const nextCorrectCount =
    (existing?.correctCount ?? 0) + (result === "correct" ? 1 : 0);
  const nextIncorrectCount =
    (existing?.incorrectCount ?? 0) + (result === "incorrect" ? 1 : 0);
  const nextStreakCount =
    result === "correct"
      ? (existing?.streakCount ?? 0) + 1
      : result === "incorrect"
        ? 0
        : existing?.streakCount ?? 0;

  return {
    status: deriveProgressStatus(
      result,
      existing?.status ?? null,
      nextIntervalDays,
      nextStreakCount,
    ),
    correct_count: nextCorrectCount,
    incorrect_count: nextIncorrectCount,
    streak_count: nextStreakCount,
    interval_days: nextIntervalDays,
    ease_factor: existing?.easeFactor ?? 2.5,
    last_reviewed_at: now.toISOString(),
    next_review_at: calculateNextReviewAt(now, nextIntervalDays),
  };
}
