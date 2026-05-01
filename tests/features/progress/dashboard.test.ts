import test from "node:test";
import assert from "node:assert/strict";

import {
  buildComparisonMetric,
  buildNormalizedTimeSeries,
  resolvePreviousDashboardTimeRange,
  resolveDashboardTimeRange,
  summarizeProgressTimeSeries,
  summarizeVocabularyStatuses,
} from "@/features/progress/dashboard.utils";
import { dashboardTimeRangeSchema } from "@/features/progress/dashboard.schemas";

test("summarizeVocabularyStatuses maps memory states into learner-facing buckets", () => {
  const summary = summarizeVocabularyStatuses([
    { state: "new", interval_days: 0 },
    { state: "learning", interval_days: 1 },
    { state: "relearning", interval_days: 1 },
    { state: "review", interval_days: 7 },
    { state: "review", interval_days: 30 },
  ]);

  assert.deepEqual(summary, {
    new: 1,
    learning: 2,
    review: 1,
    mastered: 1,
    total: 5,
    hasActivity: true,
  });
});

test("resolveDashboardTimeRange returns inclusive UTC day windows", () => {
  const now = new Date("2026-04-30T15:00:00.000Z");
  const range = resolveDashboardTimeRange("7d", now);

  assert.equal(range.days, 7);
  assert.equal(range.fromIso, "2026-04-24T00:00:00.000Z");
  assert.equal(range.toIso, "2026-05-01T00:00:00.000Z");
});

test("buildNormalizedTimeSeries creates zero-filled points for empty states", () => {
  const series = buildNormalizedTimeSeries("today", new Date("2026-04-30T15:00:00.000Z"));

  assert.equal(series.points.length, 1);
  assert.deepEqual(series.points[0], {
    date: "2026-04-30",
    newWords: 0,
    reviews: 0,
    correctReviews: 0,
    incorrectReviews: 0,
    readingCompleted: 0,
    listeningCompleted: 0,
    writingCompleted: 0,
    lessonsCompleted: 0,
    xpEarned: 0,
  });
  assert.equal(series.hasActivity, false);
});

test("resolvePreviousDashboardTimeRange returns the immediately preceding window", () => {
  const now = new Date("2026-04-30T15:00:00.000Z");
  const range = resolvePreviousDashboardTimeRange("30d", now);

  assert.equal(range.days, 30);
  assert.equal(range.fromIso, "2026-03-02T00:00:00.000Z");
  assert.equal(range.toIso, "2026-04-01T00:00:00.000Z");
});

test("summarizeProgressTimeSeries rolls up totals and accuracy", () => {
  const series = buildNormalizedTimeSeries("today", new Date("2026-04-30T15:00:00.000Z"));
  series.points[0] = {
    date: "2026-04-30",
    newWords: 3,
    reviews: 10,
    correctReviews: 8,
    incorrectReviews: 2,
    readingCompleted: 4,
    listeningCompleted: 2,
    writingCompleted: 1,
    lessonsCompleted: 2,
    xpEarned: 90,
  };

  assert.deepEqual(summarizeProgressTimeSeries(series), {
    reviews: 10,
    newWords: 3,
    xpEarned: 90,
    correctReviews: 8,
    incorrectReviews: 2,
    accuracyRate: 80,
    readingCompleted: 4,
    listeningCompleted: 2,
    writingCompleted: 1,
    lessonsCompleted: 2,
    hasActivity: true,
  });
});

test("buildComparisonMetric avoids misleading percentages when the previous period is empty", () => {
  assert.deepEqual(buildComparisonMetric(12, 0), {
    current: 12,
    previous: 0,
    delta: 12,
    percentageChange: null,
    trend: "none",
  });
});

test("buildComparisonMetric returns signed percentage trends when both periods have data", () => {
  assert.deepEqual(buildComparisonMetric(14, 10), {
    current: 14,
    previous: 10,
    delta: 4,
    percentageChange: 40,
    trend: "up",
  });

  assert.deepEqual(buildComparisonMetric(6, 10), {
    current: 6,
    previous: 10,
    delta: -4,
    percentageChange: -40,
    trend: "down",
  });

  assert.deepEqual(buildComparisonMetric(10, 10), {
    current: 10,
    previous: 10,
    delta: 0,
    percentageChange: 0,
    trend: "neutral",
  });
});

test("parseDashboardTimeRange validates supported ranges", () => {
  assert.equal(dashboardTimeRangeSchema.parse("90d"), "90d");
  assert.throws(() => dashboardTimeRangeSchema.parse("14d"));
});
