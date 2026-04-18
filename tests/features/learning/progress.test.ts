import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWordProgressPatch,
  calculateNextReviewAt,
  deriveProgressStatus,
  getNextIntervalDays,
} from "@/features/learning/progress";

test("interval progression follows the simple spaced repetition ladder", () => {
  assert.equal(getNextIntervalDays("correct", 1), 3);
  assert.equal(getNextIntervalDays("correct", 14), 30);
  assert.equal(getNextIntervalDays("incorrect", 14), 1);
  assert.equal(getNextIntervalDays("skipped", 7), 7);
});

test("progress patch resets incorrect streaks and advances mastered words", () => {
  const now = new Date("2026-04-18T00:00:00.000Z");

  const incorrectPatch = buildWordProgressPatch(
    {
      status: "review",
      correctCount: 3,
      incorrectCount: 1,
      streakCount: 2,
      intervalDays: 7,
      easeFactor: 2.5,
    },
    "incorrect",
    now,
  );

  assert.equal(incorrectPatch.streak_count, 0);
  assert.equal(incorrectPatch.interval_days, 1);
  assert.equal(incorrectPatch.status, "learning");

  const correctPatch = buildWordProgressPatch(
    {
      status: "review",
      correctCount: 4,
      incorrectCount: 1,
      streakCount: 3,
      intervalDays: 14,
      easeFactor: 2.5,
    },
    "correct",
    now,
  );

  assert.equal(correctPatch.interval_days, 30);
  assert.equal(correctPatch.status, "mastered");
  assert.equal(
    calculateNextReviewAt(now, 30),
    new Date("2026-05-18T00:00:00.000Z").toISOString(),
  );
  assert.equal(deriveProgressStatus("skipped", "review", 7, 3), "review");
});
