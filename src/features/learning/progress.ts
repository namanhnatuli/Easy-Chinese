import type { MemoryCardState, ProgressStatus, ReviewResult } from "@/types/domain";

export interface ExistingWordProgressSnapshot {
  status: ProgressStatus;
  correctCount: number;
  incorrectCount: number;
  streakCount: number;
  intervalDays: number;
  easeFactor: number;
}

export function deriveProgressStatus(
  memoryState: MemoryCardState,
  intervalDays: number,
): ProgressStatus {
  if (memoryState === "new") {
    return "new";
  }

  if (memoryState === "learning" || memoryState === "relearning") {
    return "learning";
  }

  if (intervalDays >= 30) {
    return "mastered";
  }

  return "review";
}

export function buildWordProgressPatch(
  existing: ExistingWordProgressSnapshot | null,
  result: ReviewResult,
  now: Date,
  nextMemory?: {
    state: MemoryCardState;
    intervalDays: number;
  } | null,
) {
  // user_word_progress now mirrors learner-facing counts/status only.
  // Scheduling lives exclusively in user_word_memory.
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
    status: nextMemory
      ? deriveProgressStatus(nextMemory.state, nextMemory.intervalDays)
      : result === "incorrect"
        ? "learning"
        : existing?.status ?? "new",
    correct_count: nextCorrectCount,
    incorrect_count: nextIncorrectCount,
    streak_count: nextStreakCount,
    interval_days: existing?.intervalDays ?? 1,
    ease_factor: existing?.easeFactor ?? 2.5,
    last_reviewed_at: now.toISOString(),
    next_review_at: null,
  };
}
