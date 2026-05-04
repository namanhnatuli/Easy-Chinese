import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getUserProgressAnalytics,
  getUserProgressSummary,
  getUserRecentActivity,
  getUserSkillBreakdown,
  getUserVocabularyStatusBreakdown,
} from "@/features/progress/dashboard";
import { getGamificationDashboardSummary } from "@/features/gamification/queries";
import { buildDailyActivitySummary, buildProgressSummary } from "@/features/progress/summary";
import {
  getDailyGoalProgress,
  listPersonalizedReviewQueue,
  listRecommendedArticlesForUser,
  listRecommendedLessonsForUser,
} from "@/features/memory/queries";
import { getPracticeDashboardSummary, listRecentPracticeActivity } from "@/features/practice/queries";
import type { DashboardTimeRange } from "@/features/progress/dashboard.schemas";

import type {
  DashboardData,
  DueReviewItem,
  LessonProgressSummary,
  RecentArticleProgressItem,
  RecentReviewActivityItem,
  SuggestedLessonItem,
} from "@/features/progress/types";

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function listDueReviewItems(userId: string, limit = 20): Promise<DueReviewItem[]> {
  return listPersonalizedReviewQueue(userId, limit);
}

export async function listRecentReviewActivity(
  userId: string,
  limit = 8,
): Promise<RecentReviewActivityItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("review_events")
    .select(
      "id, reviewed_at, result, mode, sense_id, words!inner(id, slug, hanzi, pinyin, vietnamese_meaning, is_published), word_senses(id, pinyin, meaning_vi)",
    )
    .eq("user_id", userId)
    .not("mode", "is", null)
    .eq("words.is_published", true)
    .order("reviewed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => {
      const word = normalizeRelation(row.words);
      if (!word) {
        return null;
      }

      return {
        id: row.id,
        reviewedAt: row.reviewed_at,
        result: row.result,
        mode: row.mode,
        senseId: row.sense_id,
        word: {
          id: word.id,
          slug: word.slug,
          hanzi: word.hanzi,
          pinyin: word.pinyin,
          vietnameseMeaning: word.vietnamese_meaning,
        },
        sense: normalizeRelation(row.word_senses)
          ? {
              id: normalizeRelation(row.word_senses)!.id,
              pinyin: normalizeRelation(row.word_senses)!.pinyin,
              meaningVi: normalizeRelation(row.word_senses)!.meaning_vi,
            }
          : null,
      } satisfies RecentReviewActivityItem;
    })
    .filter((item): item is RecentReviewActivityItem => item !== null);
}

export async function listRecentLessonProgress(
  userId: string,
  limit = 5,
): Promise<LessonProgressSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_lesson_progress")
    .select(
      "completion_percent, last_studied_at, completed_at, lessons!inner(id, title, slug, hsk_level, is_published, lesson_words(word_id), lesson_grammar_points(grammar_point_id))",
    )
    .eq("user_id", userId)
    .eq("lessons.is_published", true)
    .order("last_studied_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => {
      const lesson = normalizeRelation(row.lessons);
      if (!lesson) {
        return null;
      }

      return {
        lessonId: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        hskLevel: lesson.hsk_level,
        completionPercent: Number(row.completion_percent),
        lastStudiedAt: row.last_studied_at,
        completedAt: row.completed_at,
        wordCount: lesson.lesson_words?.length ?? 0,
        grammarCount: lesson.lesson_grammar_points?.length ?? 0,
      } satisfies LessonProgressSummary;
    })
    .filter((item): item is LessonProgressSummary => item !== null);
}

export async function listSuggestedLessons(limit = 3): Promise<SuggestedLessonItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("id, title, slug, hsk_level, description")
    .eq("is_published", true)
    .order("sort_order")
    .order("title")
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    slug: lesson.slug,
    hskLevel: lesson.hsk_level,
    description: lesson.description,
  }));
}

export async function listSuggestedLessonsForUser(
  userId: string,
  limit = 3,
): Promise<SuggestedLessonItem[]> {
  return listRecommendedLessonsForUser(userId, limit);
}

export async function listRecentArticleProgress(
  userId: string,
  limit = 5,
): Promise<RecentArticleProgressItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_article_progress")
    .select(
      "status, bookmarked, last_read_at, completed_at, learning_articles!inner(id, title, slug, is_published)",
    )
    .eq("user_id", userId)
    .eq("learning_articles.is_published", true)
    .order("last_read_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => {
      const article = normalizeRelation(row.learning_articles);
      if (!article) {
        return null;
      }

      return {
        articleId: article.id,
        title: article.title,
        slug: article.slug,
        status: row.status,
        bookmarked: row.bookmarked,
        lastReadAt: row.last_read_at,
        completedAt: row.completed_at,
      } satisfies RecentArticleProgressItem;
    })
    .filter((item): item is RecentArticleProgressItem => item !== null);
}

export async function getDashboardData(
  userId: string,
  options?: { range?: DashboardTimeRange },
): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const range = options?.range ?? "30d";

  const [
    { data: memoryRows, error: memoryError },
    { data: lessonRows, error: lessonError },
    { data: articleRows, error: articleError },
    { data: dailyActivityRows, error: dailyActivityError },
  ] = await Promise.all([
    supabase
      .from("user_word_memory")
      .select("word_id, sense_id, state, interval_days, due_at, lapses")
      .eq("user_id", userId),
    supabase
      .from("user_lesson_progress")
      .select("completion_percent, completed_at")
      .eq("user_id", userId),
    supabase
      .from("user_article_progress")
      .select("status, bookmarked, completed_at")
      .eq("user_id", userId),
    supabase
      .from("review_events")
      .select("reviewed_at")
      .eq("user_id", userId)
      .order("reviewed_at", { ascending: false })
      .limit(120),
  ]);

  if (lessonError) {
    throw lessonError;
  }

  if (memoryError) {
    throw memoryError;
  }

  if (articleError) {
    throw articleError;
  }

  if (dailyActivityError) {
    throw dailyActivityError;
  }

  const wordsWithSenseProgress = Array.from(
    new Set(
      (memoryRows ?? [])
        .filter((row) => row.sense_id)
        .map((row) => row.word_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let publishedSenseRows: Array<{ word_id: string }> = [];
  if (wordsWithSenseProgress.length > 0) {
    const { data: senseRows, error: publishedSenseError } = await supabase
      .from("word_senses")
      .select("word_id")
      .eq("is_published", true)
      .in("word_id", wordsWithSenseProgress);

    if (publishedSenseError) {
      throw publishedSenseError;
    }

    publishedSenseRows = senseRows ?? [];
  }

  const [
    recentLessonProgress,
    recentArticleProgress,
    recentReviewActivity,
    practiceSummary,
    recentPracticeActivity,
    dailyGoalProgress,
    gamification,
    progressSummary,
    progressAnalytics,
    skillBreakdown,
    vocabularyStatusBreakdown,
    recentActivityFeed,
    personalizedLessons,
    recommendedArticles,
  ] = await Promise.all([
    listRecentLessonProgress(userId),
    listRecentArticleProgress(userId),
    listRecentReviewActivity(userId),
    getPracticeDashboardSummary(userId),
    listRecentPracticeActivity(userId),
    getDailyGoalProgress(userId),
    getGamificationDashboardSummary(userId),
    getUserProgressSummary(userId),
    getUserProgressAnalytics(userId, { range }),
    getUserSkillBreakdown(userId),
    getUserVocabularyStatusBreakdown(userId),
    getUserRecentActivity(userId),
    listRecommendedLessonsForUser(userId, 3),
    listRecommendedArticlesForUser(userId, 3),
  ]);

  const continueLesson = recentLessonProgress.find(
    (lesson) => lesson.completionPercent > 0 && lesson.completionPercent < 100,
  );

  const suggestedNextAction =
    dailyGoalProgress.wordsToReviewToday > 0
      ? {
          href: "/review",
          titleKey: "dashboard.suggestedActions.review" as const,
          descriptionKey: "dashboard.suggestedActionBodies.review" as const,
        }
      : continueLesson
        ? {
            href: `/learn/lesson/${continueLesson.lessonId}`,
            titleKey: "dashboard.suggestedActions.lesson" as const,
            descriptionKey: "dashboard.suggestedActionBodies.lesson" as const,
          }
        : {
            href: "/practice/reading",
            titleKey: "dashboard.suggestedActions.practice" as const,
            descriptionKey: "dashboard.suggestedActionBodies.practice" as const,
          };

  const summary = buildProgressSummary(
    (memoryRows ?? []).map((row) => ({
      status:
        row.state === "review"
          ? row.interval_days >= 30
            ? "mastered"
            : "review"
          : row.state === "new"
            ? "new"
            : "learning",
      next_review_at: row.due_at ?? null,
    })),
    now,
  );
  const senseMemoryRows = (memoryRows ?? []).filter((row) => row.sense_id);
  const knownSenses = senseMemoryRows.filter((row) => row.state !== "new").length;
  const difficultSenses = senseMemoryRows.filter((row) => (row.lapses ?? 0) > 0).length;
  const learnedSenseCountsByWordId = new Map<string, number>();
  for (const row of senseMemoryRows) {
    if (!learnedSenseCountsByWordId.has(row.word_id)) {
      learnedSenseCountsByWordId.set(row.word_id, 0);
    }
    learnedSenseCountsByWordId.set(row.word_id, (learnedSenseCountsByWordId.get(row.word_id) ?? 0) + 1);
  }
  const publishedSenseCountsByWordId = new Map<string, number>();
  for (const row of publishedSenseRows) {
    publishedSenseCountsByWordId.set(row.word_id, (publishedSenseCountsByWordId.get(row.word_id) ?? 0) + 1);
  }
  const partiallyLearnedMultiSenseWords = Array.from(learnedSenseCountsByWordId.entries()).filter(
    ([wordId, learnedCount]) => {
      const totalPublished = publishedSenseCountsByWordId.get(wordId) ?? 0;
      return totalPublished > 1 && learnedCount > 0 && learnedCount < totalPublished;
    },
  ).length;
  const completedLessonsCount = (lessonRows ?? []).filter(
    (row) => row.completed_at || Number(row.completion_percent) >= 100,
  ).length;
  const inProgressLessonsCount = (lessonRows ?? []).filter((row) => {
    const percent = Number(row.completion_percent);
    return percent > 0 && percent < 100;
  }).length;
  const completedArticlesCount = (articleRows ?? []).filter((row) => row.status === "completed").length;
  const bookmarkedArticlesCount = (articleRows ?? []).filter((row) => row.bookmarked).length;

  return {
    summary: {
      ...summary,
      knownSenses,
      difficultSenses,
      partiallyLearnedMultiSenseWords,
    },
    progressSummary,
    progressTimeSeries: progressAnalytics.timeSeries,
    progressComparison: progressAnalytics.comparison,
    skillBreakdown,
    vocabularyStatusBreakdown,
    recentActivityFeed,
    completedLessonsCount,
    inProgressLessonsCount,
    completedArticlesCount,
    bookmarkedArticlesCount,
    practiceSummary,
    recentLessonProgress,
    recentArticleProgress,
    recentReviewActivity,
    recentPracticeActivity,
    dailyActivity: buildDailyActivitySummary(dailyActivityRows ?? [], now),
    dailyGoalProgress,
    gamification,
    suggestedNextAction,
    nextLessonRecommendation: personalizedLessons[0] ?? null,
    recommendedArticles,
  };
}
