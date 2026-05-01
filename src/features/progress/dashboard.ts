import { createSupabaseServerClient } from "@/lib/supabase/server";
import { countSuccessfulLearningActivitiesToday } from "@/features/memory/activity";

import { calculateLevelFromXp } from "@/features/gamification/leveling";
import {
  addUtcDays,
  buildComparisonMetric,
  buildNormalizedTimeSeries,
  getPreviousPeriodLabel,
  resolvePreviousDashboardTimeRange,
  resolveDashboardTimeRange,
  roundAccuracyRate,
  summarizeProgressTimeSeries,
  summarizeVocabularyStatuses,
  toUtcDayKey,
  toUtcDayStart,
} from "@/features/progress/dashboard.utils";
import {
  dashboardTimeRangeSchema,
  userProgressTimeSeriesInputSchema,
  type DashboardTimeRange,
  type UserProgressTimeSeriesInput,
} from "@/features/progress/dashboard.schemas";
import type {
  UserProgressAnalytics,
  UserProgressPeriodComparison,
  UserProgressSummary,
  UserProgressTimeSeries,
  UserRecentActivity,
  UserRecentActivityItem,
  UserSkillBreakdown,
  UserVocabularyStatusBreakdown,
} from "@/features/progress/dashboard.types";
import { getDefaultDailyGoal, getVisibleStreakCount } from "@/features/memory/spaced-repetition";

type ProgressTimeSeriesRows = {
  memoryRows: Array<{ created_at: string }>;
  reviewRows: Array<{ reviewed_at: string; result: "correct" | "incorrect" | "skipped" }>;
  practiceRows: Array<{ created_at: string; practice_type: string; result: string }>;
  lessonRows: Array<{ completed_at: string | null }>;
  xpRows: Array<{ created_at: string; amount: number | string | null }>;
};

async function loadProgressTimeSeriesRows(userId: string, fromIso: string, toIso: string): Promise<ProgressTimeSeriesRows> {
  const supabase = await createSupabaseServerClient();
  const [
    { data: memoryRows, error: memoryError },
    { data: reviewRows, error: reviewError },
    { data: practiceRows, error: practiceError },
    { data: lessonRows, error: lessonError },
    { data: xpRows, error: xpError },
  ] = await Promise.all([
    supabase
      .from("user_word_memory")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", fromIso)
      .lt("created_at", toIso),
    supabase
      .from("review_events")
      .select("reviewed_at, result")
      .eq("user_id", userId)
      .gte("reviewed_at", fromIso)
      .lt("reviewed_at", toIso),
    supabase
      .from("practice_events")
      .select("created_at, practice_type, result")
      .eq("user_id", userId)
      .gte("created_at", fromIso)
      .lt("created_at", toIso),
    supabase
      .from("user_lesson_progress")
      .select("completed_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .gte("completed_at", fromIso)
      .lt("completed_at", toIso),
    supabase
      .from("user_xp_events")
      .select("created_at, amount")
      .eq("user_id", userId)
      .gte("created_at", fromIso)
      .lt("created_at", toIso),
  ]);

  if (memoryError) throw memoryError;
  if (reviewError) throw reviewError;
  if (practiceError) throw practiceError;
  if (lessonError) throw lessonError;
  if (xpError) throw xpError;

  return {
    memoryRows: (memoryRows ?? []) as ProgressTimeSeriesRows["memoryRows"],
    reviewRows: (reviewRows ?? []) as ProgressTimeSeriesRows["reviewRows"],
    practiceRows: (practiceRows ?? []) as ProgressTimeSeriesRows["practiceRows"],
    lessonRows: (lessonRows ?? []) as ProgressTimeSeriesRows["lessonRows"],
    xpRows: (xpRows ?? []) as ProgressTimeSeriesRows["xpRows"],
  };
}

function buildTimeSeriesFromRows(
  range: DashboardTimeRange,
  windowEnd: Date,
  rows: ProgressTimeSeriesRows,
): UserProgressTimeSeries {
  const series = buildNormalizedTimeSeries(range, windowEnd);
  const pointMap = new Map(series.points.map((point) => [point.date, point]));

  for (const row of rows.memoryRows) {
    const point = pointMap.get(toUtcDayKey(row.created_at));
    if (point) {
      point.newWords += 1;
    }
  }

  for (const row of rows.reviewRows) {
    const point = pointMap.get(toUtcDayKey(row.reviewed_at));
    if (!point) {
      continue;
    }

    point.reviews += 1;
    if (row.result === "correct") {
      point.correctReviews += 1;
    }
    if (row.result === "incorrect") {
      point.incorrectReviews += 1;
    }
  }

  for (const row of rows.practiceRows) {
    const point = pointMap.get(toUtcDayKey(row.created_at));
    if (!point || row.result !== "completed") {
      continue;
    }

    if (row.practice_type === "reading_word" || row.practice_type === "reading_sentence") {
      point.readingCompleted += 1;
    }

    if (row.practice_type === "listening_dictation") {
      point.listeningCompleted += 1;
    }

    if (row.practice_type === "writing_character") {
      point.writingCompleted += 1;
    }
  }

  for (const row of rows.lessonRows) {
    if (!row.completed_at) {
      continue;
    }

    const point = pointMap.get(toUtcDayKey(row.completed_at));
    if (point) {
      point.lessonsCompleted += 1;
    }
  }

  for (const row of rows.xpRows) {
    const point = pointMap.get(toUtcDayKey(row.created_at));
    if (point) {
      point.xpEarned += Number(row.amount ?? 0);
    }
  }

  series.hasActivity = summarizeProgressTimeSeries(series).hasActivity;

  return series;
}

function buildProgressComparison(
  range: DashboardTimeRange,
  currentSeries: UserProgressTimeSeries,
  previousSeries: UserProgressTimeSeries,
): UserProgressPeriodComparison {
  const current = summarizeProgressTimeSeries(currentSeries);
  const previous = summarizeProgressTimeSeries(previousSeries);

  return {
    range,
    previousPeriodLabel: getPreviousPeriodLabel(range),
    current,
    previous,
    metrics: {
      reviews: buildComparisonMetric(current.reviews, previous.reviews),
      newWords: buildComparisonMetric(current.newWords, previous.newWords),
      xpEarned: buildComparisonMetric(current.xpEarned, previous.xpEarned),
      accuracyRate: buildComparisonMetric(current.accuracyRate, previous.accuracyRate),
      readingCompleted: buildComparisonMetric(current.readingCompleted, previous.readingCompleted),
      listeningCompleted: buildComparisonMetric(current.listeningCompleted, previous.listeningCompleted),
      writingCompleted: buildComparisonMetric(current.writingCompleted, previous.writingCompleted),
      lessonsCompleted: buildComparisonMetric(current.lessonsCompleted, previous.lessonsCompleted),
    },
  };
}

export async function getUserProgressAnalytics(
  userId: string,
  input: UserProgressTimeSeriesInput = {},
): Promise<UserProgressAnalytics> {
  const { range } = userProgressTimeSeriesInputSchema.parse(input);
  const currentWindow = resolveDashboardTimeRange(range);
  const previousWindow = resolvePreviousDashboardTimeRange(range);
  const rows = await loadProgressTimeSeriesRows(userId, previousWindow.fromIso, currentWindow.toIso);
  const currentSeries = buildTimeSeriesFromRows(range, currentWindow.end, rows);
  const previousSeries = buildTimeSeriesFromRows(range, previousWindow.end, rows);

  return {
    timeSeries: currentSeries,
    comparison: buildProgressComparison(range, currentSeries, previousSeries),
  };
}

export async function getUserProgressSummary(userId: string): Promise<UserProgressSummary> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const startOfToday = toUtcDayStart(now);
  const endOfToday = addUtcDays(startOfToday, 1);

  const [
    { data: memoryRows, error: memoryError },
    { data: learningStatsRow, error: learningStatsError },
    { data: xpRow, error: xpError },
    { data: levelRow, error: levelError },
    { count: correctReviewCount, error: correctReviewError },
    { count: incorrectReviewCount, error: incorrectReviewError },
    { data: difficultReadingRows, error: difficultReadingError },
    { data: difficultWritingRows, error: difficultWritingError },
    completedToday,
  ] = await Promise.all([
    supabase
      .from("user_word_memory")
      .select("state, interval_days, due_at, reps, last_reviewed_at")
      .eq("user_id", userId),
    supabase
      .from("user_learning_stats")
      .select("streak_count, last_active_date, daily_goal")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("user_xp").select("total_xp").eq("user_id", userId).maybeSingle(),
    supabase.from("user_level").select("level").eq("user_id", userId).maybeSingle(),
    supabase
      .from("review_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("result", "correct"),
    supabase
      .from("review_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("result", "incorrect"),
    supabase
      .from("user_reading_progress")
      .select("word_id")
      .eq("user_id", userId)
      .eq("status", "difficult")
      .not("word_id", "is", null),
    supabase
      .from("user_writing_progress")
      .select("word_id")
      .eq("user_id", userId)
      .eq("status", "difficult"),
    countSuccessfulLearningActivitiesToday({
      supabase,
      userId,
      from: startOfToday.toISOString(),
      to: endOfToday.toISOString(),
    }),
  ]);

  if (memoryError) throw memoryError;
  if (learningStatsError) throw learningStatsError;
  if (xpError) throw xpError;
  if (levelError) throw levelError;
  if (correctReviewError) throw correctReviewError;
  if (incorrectReviewError) throw incorrectReviewError;
  if (difficultReadingError) throw difficultReadingError;
  if (difficultWritingError) throw difficultWritingError;

  const totalXp = xpRow?.total_xp ?? 0;
  const fallbackLevel = calculateLevelFromXp(totalXp);
  const difficultWords = new Set([
    ...(difficultReadingRows ?? []).map((row) => row.word_id).filter((value): value is string => Boolean(value)),
    ...(difficultWritingRows ?? []).map((row) => row.word_id).filter((value): value is string => Boolean(value)),
  ]).size;
  const dueToday = (memoryRows ?? []).filter((row) => row.due_at && new Date(row.due_at) < endOfToday).length;
  const totalWordsLearned = (memoryRows ?? []).filter(
    (row) => row.reps > 0 || row.last_reviewed_at !== null,
  ).length;
  const dailyGoal = learningStatsRow?.daily_goal ?? getDefaultDailyGoal();
  const streakDays = getVisibleStreakCount(
    learningStatsRow
      ? {
          streakCount: learningStatsRow.streak_count,
          lastActiveDate: learningStatsRow.last_active_date,
          dailyGoal,
          schedulerType: "fsrs",
          desiredRetention: 0.9,
          maximumIntervalDays: 36500,
        }
      : null,
    now,
  );

  return {
    totalWordsLearned,
    dueToday,
    streakDays,
    totalXp,
    currentLevel: levelRow?.level ?? fallbackLevel.level,
    completionToday: completedToday ?? 0,
    difficultWords,
    accuracyRate: roundAccuracyRate(correctReviewCount ?? 0, incorrectReviewCount ?? 0),
    dailyGoal,
    hasActivity:
      totalWordsLearned > 0 ||
      (completedToday ?? 0) > 0 ||
      difficultWords > 0 ||
      totalXp > 0 ||
      dueToday > 0,
  };
}

export async function getUserVocabularyStatusBreakdown(
  userId: string,
): Promise<UserVocabularyStatusBreakdown> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_word_memory")
    .select("state, interval_days")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return summarizeVocabularyStatuses(
    (data ?? []).map((row) => ({
      state: row.state,
      interval_days: row.interval_days,
    })),
  );
}

export async function getUserSkillBreakdown(userId: string): Promise<UserSkillBreakdown> {
  const supabase = await createSupabaseServerClient();
  const [
    { count: reviewCount, error: reviewError },
    { count: readingCount, error: readingError },
    { count: listeningCount, error: listeningError },
    { count: writingCount, error: writingError },
    { count: articleCount, error: articleError },
    { data: lessonRows, error: lessonError },
  ] = await Promise.all([
    supabase.from("review_events").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("user_reading_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("user_listening_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("user_writing_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("user_article_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("user_lesson_progress")
      .select("completion_percent, completed_at")
      .eq("user_id", userId),
  ]);

  if (reviewError) throw reviewError;
  if (readingError) throw readingError;
  if (listeningError) throw listeningError;
  if (writingError) throw writingError;
  if (articleError) throw articleError;
  if (lessonError) throw lessonError;

  const lessons =
    (lessonRows ?? []).filter(
      (row) => row.completed_at !== null || Number(row.completion_percent) >= 100,
    ).length;

  return {
    reviews: reviewCount ?? 0,
    reading: readingCount ?? 0,
    listening: listeningCount ?? 0,
    writing: writingCount ?? 0,
    articles: articleCount ?? 0,
    lessons,
    hasActivity:
      (reviewCount ?? 0) > 0 ||
      (readingCount ?? 0) > 0 ||
      (listeningCount ?? 0) > 0 ||
      (writingCount ?? 0) > 0 ||
      (articleCount ?? 0) > 0 ||
      lessons > 0,
  };
}

export async function getUserProgressTimeSeries(
  userId: string,
  input: UserProgressTimeSeriesInput = {},
): Promise<UserProgressTimeSeries> {
  const analytics = await getUserProgressAnalytics(userId, input);

  return analytics.timeSeries;
}

export async function getUserProgressComparison(
  userId: string,
  input: UserProgressTimeSeriesInput = {},
): Promise<UserProgressPeriodComparison> {
  const analytics = await getUserProgressAnalytics(userId, input);

  return analytics.comparison;
}

export async function getUserRecentActivity(
  userId: string,
  limit = 8,
): Promise<UserRecentActivity> {
  const supabase = await createSupabaseServerClient();
  const [
    { data: reviewRows, error: reviewError },
    { data: practiceRows, error: practiceError },
    { data: articleRows, error: articleError },
    { data: lessonRows, error: lessonError },
  ] = await Promise.all([
    supabase
      .from("review_events")
      .select("reviewed_at, result, mode, words!inner(slug, hanzi)")
      .eq("user_id", userId)
      .order("reviewed_at", { ascending: false })
      .limit(limit),
    supabase
      .from("practice_events")
      .select("created_at, practice_type, result, metadata, tts_audio_cache(text_preview, source_text, character_count), words(slug, hanzi), word_examples(chinese_text)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("user_article_progress")
      .select("last_read_at, status, bookmarked, learning_articles!inner(slug, title)")
      .eq("user_id", userId)
      .not("last_read_at", "is", null)
      .order("last_read_at", { ascending: false })
      .limit(limit),
    supabase
      .from("user_lesson_progress")
      .select("last_studied_at, completion_percent, lessons!inner(id, slug, title)")
      .eq("user_id", userId)
      .not("last_studied_at", "is", null)
      .order("last_studied_at", { ascending: false })
      .limit(limit),
  ]);

  if (reviewError) throw reviewError;
  if (practiceError) throw practiceError;
  if (articleError) throw articleError;
  if (lessonError) throw lessonError;

  const items: UserRecentActivityItem[] = [];

  for (const row of reviewRows ?? []) {
    const word = Array.isArray(row.words) ? row.words[0] : row.words;
    if (!word) {
      continue;
    }

    items.push({
      type: "review",
      occurredAt: row.reviewed_at,
      label: word.hanzi,
      detail: row.result,
      href: `/vocabulary/${word.slug}`,
      meta: {
        mode: row.mode,
      },
    });
  }

  for (const row of practiceRows ?? []) {
    const word = Array.isArray(row.words) ? row.words[0] : row.words;
    const sentence = Array.isArray(row.word_examples) ? row.word_examples[0] : row.word_examples;
    const listening = Array.isArray(row.tts_audio_cache) ? row.tts_audio_cache[0] : row.tts_audio_cache;
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null;

    if (row.practice_type === "writing_character" && word) {
      items.push({
        type: "writing",
        occurredAt: row.created_at,
        label: word.hanzi,
        detail: row.result,
        href: `/vocabulary/${word.slug}`,
        meta: {
          practiceType: "writing_character",
        },
      });
      continue;
    }

    if (row.practice_type === "reading_word" && word) {
      items.push({
        type: "reading",
        occurredAt: row.created_at,
        label: word.hanzi,
        detail: row.result,
        href: `/vocabulary/${word.slug}`,
        meta: {
          practiceType: "reading_word",
        },
      });
      continue;
    }

    if (row.practice_type === "reading_sentence") {
      items.push({
        type: "reading",
        occurredAt: row.created_at,
        label: sentence?.chinese_text ?? word?.hanzi ?? "Sentence",
        detail: row.result,
        href: word?.slug ? `/vocabulary/${word.slug}` : null,
        meta: {
          practiceType: "reading_sentence",
        },
      });
      continue;
    }

    if (row.practice_type === "listening_dictation" && listening) {
      items.push({
        type: "listening",
        occurredAt: row.created_at,
        label: listening.source_text ?? listening.text_preview,
        detail: row.result,
        href: "/practice/listening",
        meta: {
          characterCount: listening.character_count,
          hintUsed: metadata?.hintUsed === true,
        },
      });
    }
  }

  for (const row of articleRows ?? []) {
    const article = Array.isArray(row.learning_articles) ? row.learning_articles[0] : row.learning_articles;
    if (!article || !row.last_read_at) {
      continue;
    }

    items.push({
      type: "article",
      occurredAt: row.last_read_at,
      label: article.title,
      detail: row.status,
      href: `/articles/${article.slug}`,
      meta: {
        bookmarked: row.bookmarked,
      },
    });
  }

  for (const row of lessonRows ?? []) {
    const lesson = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons;
    if (!lesson || !row.last_studied_at) {
      continue;
    }

    items.push({
      type: "lesson",
      occurredAt: row.last_studied_at,
      label: lesson.title,
      detail: `${Math.round(Number(row.completion_percent))}%`,
      href: `/learn/lesson/${lesson.id}`,
      meta: {
        completionPercent: Math.round(Number(row.completion_percent)),
      },
    });
  }

  items.sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  return {
    items: items.slice(0, limit),
    hasActivity: items.length > 0,
  };
}

export function parseDashboardTimeRange(input: string | undefined): DashboardTimeRange {
  return dashboardTimeRangeSchema.parse(input ?? "30d");
}
