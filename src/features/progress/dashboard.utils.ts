import type {
  UserProgressComparisonMetric,
  UserProgressPeriodComparison,
  UserProgressPeriodTotals,
  UserProgressTimeSeries,
  UserProgressTimeSeriesPoint,
  UserVocabularyStatusBreakdown,
} from "@/features/progress/dashboard.types";
import type { DashboardTimeRange } from "@/features/progress/dashboard.schemas";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MASTERED_INTERVAL_DAYS = 30;

function toUtcDayKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function toUtcDayStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, days: number) {
  return new Date(value.getTime() + days * MS_PER_DAY);
}

function buildEmptyTimeSeriesPoint(date: string): UserProgressTimeSeriesPoint {
  return {
    date,
    newWords: 0,
    reviews: 0,
    correctReviews: 0,
    incorrectReviews: 0,
    readingCompleted: 0,
    writingCompleted: 0,
    lessonsCompleted: 0,
    xpEarned: 0,
  };
}

export function summarizeVocabularyStatuses(
  rows: Array<{ state: "new" | "learning" | "review" | "relearning"; interval_days: number }>,
): UserVocabularyStatusBreakdown {
  let newCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let masteredCount = 0;

  for (const row of rows) {
    if (row.state === "new") {
      newCount += 1;
      continue;
    }

    if (row.state === "learning" || row.state === "relearning") {
      learningCount += 1;
      continue;
    }

    if (row.interval_days >= MASTERED_INTERVAL_DAYS) {
      masteredCount += 1;
      continue;
    }

    reviewCount += 1;
  }

  const total = rows.length;

  return {
    new: newCount,
    learning: learningCount,
    review: reviewCount,
    mastered: masteredCount,
    total,
    hasActivity: total > 0,
  };
}

export function resolveDashboardTimeRange(range: DashboardTimeRange, now = new Date()) {
  const end = toUtcDayStart(now);
  const days =
    range === "today"
      ? 1
      : range === "7d"
        ? 7
        : range === "30d"
          ? 30
          : range === "90d"
            ? 90
            : 365;
  const start = addUtcDays(end, -(days - 1));

  return {
    range,
    days,
    start,
    end,
    fromIso: start.toISOString(),
    toIso: addUtcDays(end, 1).toISOString(),
  };
}

export function resolvePreviousDashboardTimeRange(range: DashboardTimeRange, now = new Date()) {
  const currentWindow = resolveDashboardTimeRange(range, now);
  const previousEnd = addUtcDays(currentWindow.start, -1);
  const previousStart = addUtcDays(previousEnd, -(currentWindow.days - 1));

  return {
    range,
    days: currentWindow.days,
    start: previousStart,
    end: previousEnd,
    fromIso: previousStart.toISOString(),
    toIso: currentWindow.start.toISOString(),
  };
}

export function buildNormalizedTimeSeries(
  range: DashboardTimeRange,
  now = new Date(),
): UserProgressTimeSeries {
  const window = resolveDashboardTimeRange(range, now);
  const points: UserProgressTimeSeriesPoint[] = [];

  for (let index = 0; index < window.days; index += 1) {
    const date = addUtcDays(window.start, index);
    points.push(buildEmptyTimeSeriesPoint(toUtcDayKey(date)));
  }

  return {
    range,
    from: toUtcDayKey(window.start),
    to: toUtcDayKey(window.end),
    points,
    hasActivity: false,
  };
}

export function roundAccuracyRate(correct: number, incorrect: number) {
  const total = correct + incorrect;
  if (total <= 0) {
    return 0;
  }

  return Math.round((correct / total) * 100);
}

export function summarizeProgressTimeSeries(series: UserProgressTimeSeries): UserProgressPeriodTotals {
  const totals = series.points.reduce(
    (acc, point) => {
      acc.reviews += point.reviews;
      acc.newWords += point.newWords;
      acc.xpEarned += point.xpEarned;
      acc.correctReviews += point.correctReviews;
      acc.incorrectReviews += point.incorrectReviews;
      acc.readingCompleted += point.readingCompleted;
      acc.writingCompleted += point.writingCompleted;
      acc.lessonsCompleted += point.lessonsCompleted;
      return acc;
    },
    {
      reviews: 0,
      newWords: 0,
      xpEarned: 0,
      correctReviews: 0,
      incorrectReviews: 0,
      accuracyRate: 0,
      readingCompleted: 0,
      writingCompleted: 0,
      lessonsCompleted: 0,
      hasActivity: false,
    } as UserProgressPeriodTotals,
  );

  totals.accuracyRate = roundAccuracyRate(totals.correctReviews, totals.incorrectReviews);
  totals.hasActivity =
    totals.reviews > 0 ||
    totals.newWords > 0 ||
    totals.xpEarned > 0 ||
    totals.correctReviews > 0 ||
    totals.incorrectReviews > 0 ||
    totals.readingCompleted > 0 ||
    totals.writingCompleted > 0 ||
    totals.lessonsCompleted > 0;

  return totals;
}

export function buildComparisonMetric(current: number, previous: number): UserProgressComparisonMetric {
  const delta = current - previous;

  if (previous <= 0) {
    return {
      current,
      previous,
      delta,
      percentageChange: null,
      trend: "none",
    };
  }

  if (delta === 0) {
    return {
      current,
      previous,
      delta,
      percentageChange: 0,
      trend: "neutral",
    };
  }

  return {
    current,
    previous,
    delta,
    percentageChange: Math.round((delta / previous) * 100),
    trend: delta > 0 ? "up" : "down",
  };
}

export function getPreviousPeriodLabel(range: DashboardTimeRange): UserProgressPeriodComparison["previousPeriodLabel"] {
  if (range === "today") {
    return "yesterday";
  }

  if (range === "7d") {
    return "previous7d";
  }

  if (range === "30d") {
    return "previous30d";
  }

  if (range === "90d") {
    return "previous90d";
  }

  return "previous1y";
}

export { addUtcDays, toUtcDayKey, toUtcDayStart };
