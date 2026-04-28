import { createSupabaseServerClient } from "@/lib/supabase/server";
import { filterDueReviewRows } from "@/features/progress/review-queue";
import { buildDailyActivitySummary, buildProgressSummary } from "@/features/progress/summary";

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
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const { data, error } = await supabase
    .from("user_word_progress")
    .select(
      "status, next_review_at, last_reviewed_at, interval_days, streak_count, correct_count, incorrect_count, words!inner(id, slug, simplified, traditional, hanzi, pinyin, han_viet, vietnamese_meaning, is_published)",
    )
    .eq("user_id", userId)
    .not("next_review_at", "is", null)
    .lte("next_review_at", nowIso)
    .eq("words.is_published", true)
    .order("next_review_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return filterDueReviewRows(data ?? [], now)
    .map((row, index) => {
      const word = normalizeRelation(row.words);
      if (!word || !row.next_review_at) {
        return null;
      }

      return {
        id: word.id,
        slug: word.slug,
        simplified: word.simplified,
        traditional: word.traditional,
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        hanViet: word.han_viet,
        vietnameseMeaning: word.vietnamese_meaning,
        sortOrder: index + 1,
        status: row.status,
        nextReviewAt: row.next_review_at,
        lastReviewedAt: row.last_reviewed_at,
        intervalDays: row.interval_days,
        streakCount: row.streak_count,
        correctCount: row.correct_count,
        incorrectCount: row.incorrect_count,
      } satisfies DueReviewItem;
    })
    .filter((item): item is DueReviewItem => item !== null);
}

export async function listRecentReviewActivity(
  userId: string,
  limit = 8,
): Promise<RecentReviewActivityItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("review_events")
    .select(
      "id, reviewed_at, result, mode, words!inner(id, slug, hanzi, pinyin, vietnamese_meaning, is_published)",
    )
    .eq("user_id", userId)
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
        word: {
          id: word.id,
          slug: word.slug,
          hanzi: word.hanzi,
          pinyin: word.pinyin,
          vietnameseMeaning: word.vietnamese_meaning,
        },
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

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();

  const [
    { data: progressRows, error: progressError },
    { data: lessonRows, error: lessonError },
    { data: articleRows, error: articleError },
    { data: dailyActivityRows, error: dailyActivityError },
  ] = await Promise.all([
    supabase
      .from("user_word_progress")
      .select("status, next_review_at")
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

  if (progressError) {
    throw progressError;
  }

  if (lessonError) {
    throw lessonError;
  }

  if (articleError) {
    throw articleError;
  }

  if (dailyActivityError) {
    throw dailyActivityError;
  }

  const [recentLessonProgress, recentArticleProgress, recentReviewActivity] = await Promise.all([
    listRecentLessonProgress(userId),
    listRecentArticleProgress(userId),
    listRecentReviewActivity(userId),
  ]);

  const summary = buildProgressSummary(progressRows ?? [], now);
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
    summary,
    completedLessonsCount,
    inProgressLessonsCount,
    completedArticlesCount,
    bookmarkedArticlesCount,
    recentLessonProgress,
    recentArticleProgress,
    recentReviewActivity,
    dailyActivity: buildDailyActivitySummary(dailyActivityRows ?? [], now),
  };
}
