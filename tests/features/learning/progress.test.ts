import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWordProgressPatch,
  deriveProgressStatus,
} from "@/features/learning/progress";

test("progress status is derived from the canonical memory state", () => {
  assert.equal(deriveProgressStatus("new", 0), "new");
  assert.equal(deriveProgressStatus("learning", 0), "learning");
  assert.equal(deriveProgressStatus("relearning", 1), "learning");
  assert.equal(deriveProgressStatus("review", 7), "review");
  assert.equal(deriveProgressStatus("review", 30), "mastered");
});

test("progress patch updates counts but does not maintain an independent schedule", () => {
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
    { state: "relearning", intervalDays: 1 },
  );

  assert.equal(incorrectPatch.streak_count, 0);
  assert.equal(incorrectPatch.interval_days, 7);
  assert.equal(incorrectPatch.status, "learning");
  assert.equal(incorrectPatch.next_review_at, null);

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
    { state: "review", intervalDays: 30 },
  );

  assert.equal(correctPatch.interval_days, 14);
  assert.equal(correctPatch.status, "mastered");
  assert.equal(correctPatch.next_review_at, null);
});
