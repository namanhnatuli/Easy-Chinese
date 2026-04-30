import { cache } from "react";

import {
  listRecommendedArticlesForUser,
  listRecommendedLessonsForUser,
} from "@/features/memory/queries";
import { getDashboardData } from "@/features/progress/queries";
import { listPublicArticles, type PublicArticleListItem } from "@/features/public/articles";
import { listPublicLessons, type PublicLessonListItem } from "@/features/public/lessons";
import type { AuthUser } from "@/types/domain";

export interface HomeDashboardSummary {
  streakCount: number;
  totalXp: number;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  levelProgressPercent: number;
  dailyGoal: number;
  completedToday: number;
  remainingToday: number;
  wordsToReviewToday: number;
}

export interface HomeUserStats {
  totalWordsLearned: number;
  wordsDueToday: number;
  wordsCompletedToday: number;
  difficultWordsCount: number;
  writingPracticeCount: number;
}

export interface HomeRecentWordItem {
  id: string;
  slug: string;
  hanzi: string;
  pinyin: string;
  vietnameseMeaning: string;
}

export interface HomeRecentActivity {
  continueLesson: {
    lessonId: string;
    title: string;
    slug: string;
    hskLevel: number;
    completionPercent: number;
  } | null;
  lastArticle: {
    articleId: string;
    title: string;
    slug: string;
    status: "not_started" | "reading" | "completed";
  } | null;
  recentWords: HomeRecentWordItem[];
}

export interface HomeRecommendedLessonItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  hskLevel: number;
  topic: {
    id: string;
    name: string;
    slug: string;
  } | null;
  wordCount?: number;
  grammarCount?: number;
}

export interface HomeRecommendedArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  hskLevel: number | null;
  matchingTagNames: string[];
  tags?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export interface HomePageData {
  isAuthenticated: boolean;
  user: Pick<AuthUser, "id" | "displayName" | "email" | "avatarUrl"> | null;
  summary: HomeDashboardSummary | null;
  stats: HomeUserStats | null;
  reviewQueueCount: number;
  recentActivity: HomeRecentActivity;
  recommendedLessons: HomeRecommendedLessonItem[];
  recommendedArticles: HomeRecommendedArticle[];
}

const getCachedDashboardData = cache(async (userId: string) => getDashboardData(userId));

function mapPublicLessonItem(lesson: PublicLessonListItem): HomeRecommendedLessonItem {
  return {
    id: lesson.id,
    title: lesson.title,
    slug: lesson.slug,
    description: lesson.description,
    hskLevel: lesson.hskLevel,
    topic: lesson.topic,
    wordCount: lesson.wordCount,
    grammarCount: lesson.grammarCount,
  };
}

function mapPublicArticleItem(article: PublicArticleListItem): HomeRecommendedArticle {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    hskLevel: article.hskLevel,
    matchingTagNames: article.tags.map((tag) => tag.name),
    tags: article.tags,
  };
}

export async function getDashboardSummary(userId: string): Promise<HomeDashboardSummary> {
  const data = await getCachedDashboardData(userId);

  return {
    streakCount: data.progressSummary.streakDays,
    totalXp: data.progressSummary.totalXp,
    level: data.gamification.level,
    currentXp: data.gamification.currentXp,
    nextLevelXp: data.gamification.nextLevelXp,
    levelProgressPercent: data.gamification.progressPercent,
    dailyGoal: data.progressSummary.dailyGoal,
    completedToday: data.progressSummary.completionToday,
    remainingToday: Math.max(data.progressSummary.dailyGoal - data.progressSummary.completionToday, 0),
    wordsToReviewToday: data.progressSummary.dueToday,
  };
}

export async function getReviewQueueCount(userId: string): Promise<number> {
  const data = await getCachedDashboardData(userId);
  return data.dailyGoalProgress.wordsToReviewToday;
}

export async function getUserStats(userId: string): Promise<HomeUserStats> {
  const data = await getCachedDashboardData(userId);

  return {
    totalWordsLearned: data.progressSummary.totalWordsLearned,
    wordsDueToday: data.progressSummary.dueToday,
    wordsCompletedToday: data.progressSummary.completionToday,
    difficultWordsCount: data.progressSummary.difficultWords,
    writingPracticeCount: data.practiceSummary.writingCharactersPracticed,
  };
}

export async function getRecentActivity(userId: string): Promise<HomeRecentActivity> {
  const data = await getCachedDashboardData(userId);
  const continueLesson =
    data.recentLessonProgress.find(
      (lesson) => lesson.completionPercent > 0 && lesson.completionPercent < 100,
    ) ?? data.recentLessonProgress[0] ?? null;
  const lastArticle = data.recentArticleProgress[0] ?? null;
  const recentWords = new Map<string, HomeRecentWordItem>();

  for (const item of data.recentPracticeActivity) {
    if (item.word && !recentWords.has(item.word.id)) {
      recentWords.set(item.word.id, item.word);
    }
  }

  for (const item of data.recentReviewActivity) {
    if (!recentWords.has(item.word.id)) {
      recentWords.set(item.word.id, item.word);
    }
  }

  return {
    continueLesson: continueLesson
      ? {
          lessonId: continueLesson.lessonId,
          title: continueLesson.title,
          slug: continueLesson.slug,
          hskLevel: continueLesson.hskLevel,
          completionPercent: continueLesson.completionPercent,
        }
      : null,
    lastArticle: lastArticle
      ? {
          articleId: lastArticle.articleId,
          title: lastArticle.title,
          slug: lastArticle.slug,
          status: lastArticle.status,
        }
      : null,
    recentWords: Array.from(recentWords.values()).slice(0, 4),
  };
}

export async function getRecommendedLessons(
  userId?: string | null,
): Promise<HomeRecommendedLessonItem[]> {
  if (userId) {
    const lessons = await listRecommendedLessonsForUser(userId, 3);
    return lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description,
      hskLevel: lesson.hskLevel,
      topic: null,
    }));
  }

  const lessons = (await listPublicLessons({})).slice(0, 3);
  return lessons.map(mapPublicLessonItem);
}

export async function getRecommendedArticles(
  userId?: string | null,
): Promise<HomeRecommendedArticle[]> {
  if (userId) {
    return listRecommendedArticlesForUser(userId, 3);
  }

  const articles = (await listPublicArticles({})).slice(0, 3);
  return articles.map(mapPublicArticleItem);
}

export async function getHomePageData(user: AuthUser | null): Promise<HomePageData> {
  if (!user) {
    const [recommendedLessons, recommendedArticles] = await Promise.all([
      getRecommendedLessons(null),
      getRecommendedArticles(null),
    ]);

    return {
      isAuthenticated: false,
      user: null,
      summary: null,
      stats: null,
      reviewQueueCount: 0,
      recentActivity: {
        continueLesson: null,
        lastArticle: null,
        recentWords: [],
      },
      recommendedLessons,
      recommendedArticles,
    };
  }

  const [summary, stats, reviewQueueCount, recentActivity, recommendedLessons, recommendedArticles] =
    await Promise.all([
      getDashboardSummary(user.id),
      getUserStats(user.id),
      getReviewQueueCount(user.id),
      getRecentActivity(user.id),
      getRecommendedLessons(user.id),
      getRecommendedArticles(user.id),
    ]);

  return {
    isAuthenticated: true,
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
    summary,
    stats,
    reviewQueueCount,
    recentActivity,
    recommendedLessons,
    recommendedArticles,
  };
}
