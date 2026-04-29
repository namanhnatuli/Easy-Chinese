import assert from "node:assert/strict";
import test from "node:test";

import {
  applySchedulerGrade,
  buildWordMemoryPatch,
  predictDueHintsForGrades,
} from "@/features/memory/spaced-repetition";

test("first FSRS graduation initializes stability and difficulty", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const transition = applySchedulerGrade({
    existing: null,
    grade: "easy",
    now,
    settings: { schedulerType: "fsrs", desiredRetention: 0.9, maximumIntervalDays: 36500 },
  });

  assert.equal(transition.schedulerType, "fsrs");
  assert.equal(transition.next.state, "review");
  assert.equal(transition.next.schedulerType, "fsrs");
  assert.ok((transition.next.fsrsStability ?? 0) > 0);
  assert.ok((transition.next.fsrsDifficulty ?? 0) >= 1);
});

test("FSRS again schedules shorter than hard good and easy", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const existing = {
    schedulerType: "fsrs" as const,
    state: "review" as const,
    easeFactor: 2.5,
    intervalDays: 12,
    dueAt: "2026-04-29T00:00:00.000Z",
    reps: 10,
    lapses: 1,
    learningStepIndex: 0,
    fsrsStability: 20,
    fsrsDifficulty: 5.4,
    fsrsRetrievability: 0.88,
    scheduledDays: 12,
    elapsedDays: 12,
    lastReviewedAt: "2026-04-17T00:00:00.000Z",
    lastGrade: "good" as const,
  };

  const settings = { schedulerType: "fsrs" as const, desiredRetention: 0.9, maximumIntervalDays: 36500 };
  const again = applySchedulerGrade({ existing, grade: "again", now, settings });
  const hard = applySchedulerGrade({ existing, grade: "hard", now, settings });
  const good = applySchedulerGrade({ existing, grade: "good", now, settings });
  const easy = applySchedulerGrade({ existing, grade: "easy", now, settings });

  assert.equal(again.next.state, "relearning");
  assert.equal(hard.next.state, "review");
  assert.ok(hard.next.intervalDays < good.next.intervalDays);
  assert.ok(good.next.intervalDays < easy.next.intervalDays);
});

test("higher desired retention shortens FSRS intervals", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const existing = {
    schedulerType: "fsrs" as const,
    state: "review" as const,
    easeFactor: 2.5,
    intervalDays: 16,
    dueAt: "2026-04-29T00:00:00.000Z",
    reps: 8,
    lapses: 0,
    learningStepIndex: 0,
    fsrsStability: 32,
    fsrsDifficulty: 5,
    fsrsRetrievability: 0.9,
    scheduledDays: 16,
    elapsedDays: 16,
    lastReviewedAt: "2026-04-13T00:00:00.000Z",
    lastGrade: "good" as const,
  };

  const lower = applySchedulerGrade({
    existing,
    grade: "good",
    now,
    settings: { schedulerType: "fsrs", desiredRetention: 0.8, maximumIntervalDays: 36500 },
  });
  const higher = applySchedulerGrade({
    existing,
    grade: "good",
    now,
    settings: { schedulerType: "fsrs", desiredRetention: 0.95, maximumIntervalDays: 36500 },
  });

  assert.ok(lower.next.intervalDays > higher.next.intervalDays);
});

test("FSRS respects maximum interval and persists FSRS fields", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const existing = {
    schedulerType: "fsrs" as const,
    state: "review" as const,
    easeFactor: 2.5,
    intervalDays: 200,
    dueAt: "2026-04-29T00:00:00.000Z",
    reps: 25,
    lapses: 0,
    learningStepIndex: 0,
    fsrsStability: 300,
    fsrsDifficulty: 3.8,
    fsrsRetrievability: 0.9,
    scheduledDays: 200,
    elapsedDays: 200,
    lastReviewedAt: "2025-10-11T00:00:00.000Z",
    lastGrade: "easy" as const,
  };

  const patch = buildWordMemoryPatch(existing, "easy", now, {
    schedulerType: "fsrs",
    desiredRetention: 0.9,
    maximumIntervalDays: 30,
  });

  assert.equal(patch.scheduler_type, "fsrs");
  assert.equal(patch.interval_days, 30);
  assert.ok((patch.fsrs_stability ?? 0) > 0);
});

test("FSRS due hints use minute scheduling for relearning and day scheduling for review", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const learningHints = predictDueHintsForGrades(
    {
      schedulerType: "fsrs",
      state: "review",
      easeFactor: 2.5,
      intervalDays: 10,
      dueAt: "2026-04-29T00:00:00.000Z",
      reps: 5,
      lapses: 0,
      learningStepIndex: 0,
      fsrsStability: 18,
      fsrsDifficulty: 5.2,
      fsrsRetrievability: 0.9,
      scheduledDays: 10,
      elapsedDays: 10,
      lastReviewedAt: "2026-04-19T00:00:00.000Z",
      lastGrade: "good",
    },
    now,
    { schedulerType: "fsrs", desiredRetention: 0.9, maximumIntervalDays: 36500 },
  );

  assert.equal(learningHints.again, "10m");
  assert.match(learningHints.good, /\d+d/);
});

test("SM-2 behavior remains available when scheduler type is sm2", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const transition = applySchedulerGrade({
    existing: null,
    grade: "good",
    now,
    settings: { schedulerType: "sm2", desiredRetention: 0.9, maximumIntervalDays: 36500 },
  });

  assert.equal(transition.schedulerType, "sm2");
  assert.equal(transition.next.state, "learning");
  assert.equal(transition.next.dueAt, "2026-04-29T00:10:00.000Z");
});
