import type { DailyActivitySummary, ProgressSummary } from "@/features/progress/types";

export function getStartOfDay(value: Date) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getEndOfDay(value: Date) {
  const end = new Date(value);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function toDayKey(value: string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function buildProgressSummary(
  rows: Array<{ status: string; next_review_at: string | null }>,
  now: Date,
): ProgressSummary {
  const startOfToday = getStartOfDay(now);
  const endOfDay = getEndOfDay(now);
  let newCount = 0;
  let learningCount = 0;
  let masteredCount = 0;
  let reviewDueCount = 0;
  let dueTodayCount = 0;
  let overdueCount = 0;

  rows.forEach((row) => {
    if (row.status === "new") newCount += 1;
    if (row.status === "learning") learningCount += 1;
    if (row.status === "mastered") masteredCount += 1;

    if (!row.next_review_at) {
      return;
    }

    const nextReviewAt = new Date(row.next_review_at);

    if (nextReviewAt <= now) {
      reviewDueCount += 1;
    }

    if (nextReviewAt < startOfToday) {
      overdueCount += 1;
    } else if (nextReviewAt <= endOfDay) {
      dueTodayCount += 1;
    }
  });

  return {
    totalStudied: rows.length,
    newCount,
    learningCount,
    reviewDueCount,
    masteredCount,
    dueTodayCount,
    overdueCount,
  };
}

export function buildDailyActivitySummary(
  events: Array<{ reviewed_at: string }>,
  now: Date,
): DailyActivitySummary {
  const startOfToday = getStartOfDay(now);
  const startOf7DayWindow = new Date(startOfToday);
  startOf7DayWindow.setDate(startOf7DayWindow.getDate() - 6);

  const reviewsToday = events.filter((event) => new Date(event.reviewed_at) >= startOfToday).length;
  const reviewsLast7Days = events.filter(
    (event) => new Date(event.reviewed_at) >= startOf7DayWindow,
  ).length;

  const activeDayKeys = new Set(
    events
      .filter((event) => new Date(event.reviewed_at) >= startOf7DayWindow)
      .map((event) => toDayKey(event.reviewed_at)),
  );

  let currentStreakDays = 0;
  const cursor = getStartOfDay(now);

  while (activeDayKeys.has(cursor.toISOString())) {
    currentStreakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    reviewsToday,
    reviewsLast7Days,
    activeDaysLast7Days: activeDayKeys.size,
    currentStreakDays,
  };
}
