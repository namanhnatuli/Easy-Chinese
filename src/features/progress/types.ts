import type { ProgressStatus, ReviewMode, ReviewResult } from "@/types/domain";

export interface DueReviewItem {
  id: string;
  slug: string;
  simplified: string;
  traditional: string | null;
  hanzi: string;
  pinyin: string;
  hanViet: string | null;
  vietnameseMeaning: string;
  sortOrder: number;
  status: ProgressStatus;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  intervalDays: number;
  streakCount: number;
  correctCount: number;
  incorrectCount: number;
}

export interface ProgressSummary {
  totalStudied: number;
  newCount: number;
  learningCount: number;
  reviewDueCount: number;
  masteredCount: number;
  dueTodayCount: number;
  overdueCount: number;
}

export interface LessonProgressSummary {
  lessonId: string;
  title: string;
  slug: string;
  hskLevel: number;
  completionPercent: number;
  lastStudiedAt: string | null;
  completedAt: string | null;
  wordCount: number;
  grammarCount: number;
}

export interface RecentReviewActivityItem {
  id: string;
  reviewedAt: string;
  result: ReviewResult;
  mode: ReviewMode;
  word: {
    id: string;
    slug: string;
    hanzi: string;
    pinyin: string;
    vietnameseMeaning: string;
  };
}

export interface DailyActivitySummary {
  reviewsToday: number;
  reviewsLast7Days: number;
  activeDaysLast7Days: number;
  currentStreakDays: number;
}

export interface SuggestedLessonItem {
  id: string;
  title: string;
  slug: string;
  hskLevel: number;
  description: string | null;
}

export interface DashboardData {
  summary: ProgressSummary;
  completedLessonsCount: number;
  inProgressLessonsCount: number;
  recentLessonProgress: LessonProgressSummary[];
  recentReviewActivity: RecentReviewActivityItem[];
  dailyActivity: DailyActivitySummary;
}
