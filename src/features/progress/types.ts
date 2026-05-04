import type { MemoryCardState, ProgressStatus, ReviewMode, ReviewResult, SchedulerGrade, SchedulerType } from "@/types/domain";
import type {
  UserProgressPeriodComparison,
  UserProgressSummary,
  UserProgressTimeSeries,
  UserRecentActivity,
  UserSkillBreakdown,
  UserVocabularyStatusBreakdown,
} from "@/features/progress/dashboard.types";
import type { GamificationDashboardSummary } from "@/features/gamification/queries";
import type { PracticeDashboardSummary, RecentPracticeActivityItem } from "@/features/practice/types";

export interface DueReviewItem {
  id: string;
  wordId: string;
  senseId: string | null;
  slug: string;
  simplified: string;
  traditional: string | null;
  hanzi: string;
  pinyin: string;
  hanViet: string | null;
  vietnameseMeaning: string;
  sortOrder: number;
  partOfSpeech: string | null;
  promptExample:
    | {
        id: string;
        chineseText: string;
        pinyin: string | null;
        vietnameseMeaning: string;
      }
    | null;
  status: ProgressStatus;
  memoryState: MemoryCardState;
  schedulerType: SchedulerType;
  dueAt: string | null;
  lastReviewedAt: string | null;
  intervalDays: number;
  streakCount: number;
  correctCount: number;
  incorrectCount: number;
  queueSource: "due" | "new";
  reps: number;
  lapses: number;
  easeFactor: number;
  learningStepIndex: number;
  fsrsStability: number | null;
  fsrsDifficulty: number | null;
  fsrsRetrievability: number | null;
  scheduledDays: number;
  elapsedDays: number;
  lastGrade: SchedulerGrade | null;
}

export interface ProgressSummary {
  totalStudied: number;
  newCount: number;
  learningCount: number;
  reviewDueCount: number;
  masteredCount: number;
  dueTodayCount: number;
  overdueCount: number;
  knownSenses: number;
  difficultSenses: number;
  partiallyLearnedMultiSenseWords: number;
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
  senseId: string | null;
  word: {
    id: string;
    slug: string;
    hanzi: string;
    pinyin: string;
    vietnameseMeaning: string;
  };
  sense: {
    id: string;
    pinyin: string;
    meaningVi: string;
  } | null;
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

export interface RecommendedArticleItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  hskLevel: number | null;
  matchingTagNames: string[];
}

export interface DailyGoalProgress {
  dailyGoal: number;
  completedToday: number;
  remainingToday: number;
  streakCount: number;
  wordsToReviewToday: number;
  difficultWordsCount: number;
}

export interface RecentArticleProgressItem {
  articleId: string;
  title: string;
  slug: string;
  status: "not_started" | "reading" | "completed";
  bookmarked: boolean;
  lastReadAt: string | null;
  completedAt: string | null;
}

export interface DashboardData {
  summary: ProgressSummary;
  progressSummary: UserProgressSummary;
  progressTimeSeries: UserProgressTimeSeries;
  progressComparison: UserProgressPeriodComparison;
  skillBreakdown: UserSkillBreakdown;
  vocabularyStatusBreakdown: UserVocabularyStatusBreakdown;
  recentActivityFeed: UserRecentActivity;
  completedLessonsCount: number;
  inProgressLessonsCount: number;
  completedArticlesCount: number;
  bookmarkedArticlesCount: number;
  practiceSummary: PracticeDashboardSummary;
  recentLessonProgress: LessonProgressSummary[];
  recentArticleProgress: RecentArticleProgressItem[];
  recentReviewActivity: RecentReviewActivityItem[];
  recentPracticeActivity: RecentPracticeActivityItem[];
  dailyActivity: DailyActivitySummary;
  dailyGoalProgress: DailyGoalProgress;
  gamification: GamificationDashboardSummary;
  suggestedNextAction: {
    href: string;
    titleKey: "dashboard.suggestedActions.review" | "dashboard.suggestedActions.lesson" | "dashboard.suggestedActions.practice";
    descriptionKey:
      | "dashboard.suggestedActionBodies.review"
      | "dashboard.suggestedActionBodies.lesson"
      | "dashboard.suggestedActionBodies.practice";
  };
  nextLessonRecommendation: SuggestedLessonItem | null;
  recommendedArticles: RecommendedArticleItem[];
}
