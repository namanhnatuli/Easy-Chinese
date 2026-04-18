import assert from "node:assert/strict";
import test from "node:test";

import { buildDailyActivitySummary, buildProgressSummary } from "@/features/progress/summary";

test("progress summary counts review timing correctly", () => {
  const now = new Date("2026-04-18T10:00:00");
  const summary = buildProgressSummary(
    [
      { status: "new", next_review_at: null },
      { status: "learning", next_review_at: "2026-04-18T08:00:00" },
      { status: "mastered", next_review_at: "2026-04-17T08:00:00" },
      { status: "review", next_review_at: "2026-04-18T20:00:00" },
    ],
    now,
  );

  assert.equal(summary.totalStudied, 4);
  assert.equal(summary.newCount, 1);
  assert.equal(summary.learningCount, 1);
  assert.equal(summary.masteredCount, 1);
  assert.equal(summary.reviewDueCount, 2);
  assert.equal(summary.overdueCount, 1);
  assert.equal(summary.dueTodayCount, 2);
});

test("daily activity summary computes rolling activity and streaks", () => {
  const now = new Date("2026-04-18T10:00:00");
  const summary = buildDailyActivitySummary(
    [
      { reviewed_at: "2026-04-18T08:00:00" },
      { reviewed_at: "2026-04-17T08:00:00" },
      { reviewed_at: "2026-04-15T08:00:00" },
    ],
    now,
  );

  assert.equal(summary.reviewsToday, 1);
  assert.equal(summary.reviewsLast7Days, 3);
  assert.equal(summary.activeDaysLast7Days, 3);
  assert.equal(summary.currentStreakDays, 2);
});
