import assert from "node:assert/strict";
import test from "node:test";

import {
  applySchedulerGrade,
  buildLearningStatsPatch,
  buildWordMemoryPatch,
  createDefaultMemoryCard,
  getVisibleStreakCount,
} from "@/features/memory/spaced-repetition";

test("new card + again enters learning on the first minute step", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const transition = applySchedulerGrade({
    existing: null,
    grade: "again",
    now,
  });

  assert.equal(transition.previous.state, "new");
  assert.equal(transition.next.state, "learning");
  assert.equal(transition.next.learningStepIndex, 0);
  assert.equal(transition.next.dueAt, "2026-04-29T00:01:00.000Z");
  assert.equal(transition.next.lastGrade, "again");
});

test("new card + good advances through learning steps and then graduates to review", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");

  const firstStep = applySchedulerGrade({
    existing: null,
    grade: "good",
    now,
  });

  assert.equal(firstStep.next.state, "learning");
  assert.equal(firstStep.next.learningStepIndex, 1);
  assert.equal(firstStep.next.dueAt, "2026-04-29T00:10:00.000Z");

  const graduation = applySchedulerGrade({
    existing: firstStep.next,
    grade: "good",
    now: new Date("2026-04-29T00:10:00.000Z"),
  });

  assert.equal(graduation.next.state, "review");
  assert.equal(graduation.next.intervalDays, 1);
  assert.equal(graduation.next.dueAt, "2026-04-30T00:10:00.000Z");
});

test("new card + easy graduates immediately to review with the easy interval", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const transition = applySchedulerGrade({
    existing: null,
    grade: "easy",
    now,
  });

  assert.equal(transition.next.state, "review");
  assert.equal(transition.next.intervalDays, 4);
  assert.equal(transition.next.dueAt, "2026-05-03T00:00:00.000Z");
});

test("review card + again enters relearning and uses minute-based due dates", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const transition = applySchedulerGrade({
    existing: {
      state: "review",
      easeFactor: 2.5,
      intervalDays: 12,
      dueAt: "2026-04-29T00:00:00.000Z",
      reps: 8,
      lapses: 1,
      learningStepIndex: 0,
      lastReviewedAt: "2026-04-28T00:00:00.000Z",
      lastGrade: "good",
    },
    grade: "again",
    now,
  });

  assert.equal(transition.next.state, "relearning");
  assert.equal(transition.next.lapses, 2);
  assert.equal(transition.next.intervalDays, 1);
  assert.equal(transition.next.dueAt, "2026-04-29T00:10:00.000Z");
});

test("review card hard/good/easy produce different review intervals", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const existing = {
    state: "review" as const,
    easeFactor: 2.5,
    intervalDays: 10,
    dueAt: "2026-04-29T00:00:00.000Z",
    reps: 10,
    lapses: 0,
    learningStepIndex: 0,
    lastReviewedAt: "2026-04-28T00:00:00.000Z",
    lastGrade: "good" as const,
  };

  const hard = applySchedulerGrade({ existing, grade: "hard", now });
  const good = applySchedulerGrade({ existing, grade: "good", now });
  const easy = applySchedulerGrade({ existing, grade: "easy", now });

  assert.equal(hard.next.intervalDays, 12);
  assert.equal(good.next.intervalDays, 25);
  assert.equal(easy.next.intervalDays, 33);
  assert.ok(hard.next.easeFactor < good.next.easeFactor);
  assert.ok(easy.next.easeFactor > good.next.easeFactor);
});

test("ease factor never goes below the configured minimum", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const transition = applySchedulerGrade({
    existing: {
      state: "review",
      easeFactor: 1.3,
      intervalDays: 5,
      dueAt: "2026-04-29T00:00:00.000Z",
      reps: 5,
      lapses: 0,
      learningStepIndex: 0,
      lastReviewedAt: "2026-04-28T00:00:00.000Z",
      lastGrade: "hard",
    },
    grade: "again",
    now,
  });

  assert.equal(transition.next.easeFactor, 1.3);
});

test("buildWordMemoryPatch writes canonical scheduler fields", () => {
  const now = new Date("2026-04-29T00:00:00.000Z");
  const patch = buildWordMemoryPatch(createDefaultMemoryCard(), "good", now);

  assert.equal(patch.state, "learning");
  assert.equal(patch.learning_step_index, 1);
  assert.equal(patch.due_at, "2026-04-29T00:10:00.000Z");
  assert.equal(patch.interval_days, 0);
});

test("daily goal streaks only advance when the goal is completed", () => {
  const now = new Date("2026-04-29T12:00:00.000Z");

  const incompletePatch = buildLearningStatsPatch({
    existing: {
      streakCount: 3,
      lastActiveDate: "2026-04-28",
      dailyGoal: 10,
    },
    completedToday: 5,
    now,
  });

  assert.equal(incompletePatch.streak_count, 3);
  assert.equal(incompletePatch.last_active_date, "2026-04-28");

  const completePatch = buildLearningStatsPatch({
    existing: {
      streakCount: 3,
      lastActiveDate: "2026-04-28",
      dailyGoal: 10,
    },
    completedToday: 10,
    now,
  });

  assert.equal(completePatch.streak_count, 4);
  assert.equal(completePatch.last_active_date, "2026-04-29");
  assert.equal(getVisibleStreakCount({ streakCount: 4, lastActiveDate: "2026-04-29", dailyGoal: 10 }, now), 4);
  assert.equal(getVisibleStreakCount({ streakCount: 4, lastActiveDate: "2026-04-27", dailyGoal: 10 }, now), 0);
});
