import type { ArticleProgressStatus, PracticeEventResult, PracticeEventType, ReviewMode, ReviewResult } from "@/types/domain";

import type { DashboardTimeRange } from "@/features/progress/dashboard.schemas";

export interface UserProgressSummary {
  totalWordsLearned: number;
  dueToday: number;
  streakDays: number;
  totalXp: number;
  currentLevel: number;
  completionToday: number;
  difficultWords: number;
  accuracyRate: number;
  dailyGoal: number;
  hasActivity: boolean;
}

export interface UserVocabularyStatusBreakdown {
  new: number;
  learning: number;
  review: number;
  mastered: number;
  total: number;
  hasActivity: boolean;
}

export interface UserSkillBreakdown {
  reviews: number;
  reading: number;
  listening: number;
  writing: number;
  articles: number;
  lessons: number;
  hasActivity: boolean;
}

export interface UserProgressTimeSeriesPoint {
  date: string;
  newWords: number;
  reviews: number;
  correctReviews: number;
  incorrectReviews: number;
  readingCompleted: number;
  listeningCompleted: number;
  writingCompleted: number;
  lessonsCompleted: number;
  xpEarned: number;
}

export interface UserProgressTimeSeries {
  range: DashboardTimeRange;
  from: string;
  to: string;
  points: UserProgressTimeSeriesPoint[];
  hasActivity: boolean;
}

export interface UserProgressPeriodTotals {
  reviews: number;
  newWords: number;
  xpEarned: number;
  correctReviews: number;
  incorrectReviews: number;
  accuracyRate: number;
  readingCompleted: number;
  listeningCompleted: number;
  writingCompleted: number;
  lessonsCompleted: number;
  hasActivity: boolean;
}

export type UserProgressComparisonTrend = "up" | "down" | "neutral" | "none";

export interface UserProgressComparisonMetric {
  current: number;
  previous: number;
  delta: number;
  percentageChange: number | null;
  trend: UserProgressComparisonTrend;
}

export interface UserProgressPeriodComparison {
  range: DashboardTimeRange;
  previousPeriodLabel: "yesterday" | "previous7d" | "previous30d" | "previous90d" | "previous1y";
  current: UserProgressPeriodTotals;
  previous: UserProgressPeriodTotals;
  metrics: {
    reviews: UserProgressComparisonMetric;
    newWords: UserProgressComparisonMetric;
    xpEarned: UserProgressComparisonMetric;
    accuracyRate: UserProgressComparisonMetric;
    readingCompleted: UserProgressComparisonMetric;
    listeningCompleted: UserProgressComparisonMetric;
    writingCompleted: UserProgressComparisonMetric;
    lessonsCompleted: UserProgressComparisonMetric;
  };
}

export interface UserProgressAnalytics {
  timeSeries: UserProgressTimeSeries;
  comparison: UserProgressPeriodComparison;
}

export type UserRecentActivityItem =
  | {
      type: "review";
      occurredAt: string;
      label: string;
      detail: ReviewResult;
      href: string;
      meta: {
        mode: ReviewMode | null;
      };
    }
  | {
      type: "reading";
      occurredAt: string;
      label: string;
      detail: PracticeEventResult;
      href: string | null;
      meta: {
        practiceType: Extract<PracticeEventType, "reading_word" | "reading_sentence">;
      };
    }
  | {
      type: "writing";
      occurredAt: string;
      label: string;
      detail: PracticeEventResult;
      href: string | null;
      meta: {
        practiceType: "writing_character";
      };
    }
  | {
      type: "listening";
      occurredAt: string;
      label: string;
      detail: PracticeEventResult;
      href: string;
      meta: {
        characterCount: number;
        hintUsed: boolean;
      };
    }
  | {
      type: "article";
      occurredAt: string;
      label: string;
      detail: ArticleProgressStatus;
      href: string;
      meta: {
        bookmarked: boolean;
      };
    }
  | {
      type: "lesson";
      occurredAt: string;
      label: string;
      detail: string;
      href: string;
      meta: {
        completionPercent: number;
      };
    };

export interface UserRecentActivity {
  items: UserRecentActivityItem[];
  hasActivity: boolean;
}
