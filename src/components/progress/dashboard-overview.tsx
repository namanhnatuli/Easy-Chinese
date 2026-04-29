import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  Flame,
  LayoutDashboard,
  Medal,
  PenTool,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import { HeaderActions, HeaderLinkButton, PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData, LessonProgressSummary } from "@/features/progress/types";
import { getServerI18n } from "@/i18n/server";

function formatDateTime(value: string | null, locale: string, notYetLabel: string) {
  if (!value) {
    return notYetLabel;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function RecentArticleList({
  articles,
  locale,
  link,
  t,
}: {
  articles: DashboardData["recentArticleProgress"];
  locale: string;
  link: (href: string) => string;
  t: Awaited<ReturnType<typeof getServerI18n>>["t"];
}) {
  if (articles.length === 0) {
    return (
      <EmptyState
        title={t("dashboard.noArticleProgress")}
        description={t("dashboard.noArticleProgressDescription")}
        action={
          <Button asChild>
            <Link href={link("/articles")}>{t("articles.browseArticles")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {articles.map((article) => (
        <Link
          key={article.articleId}
          href={link(`/articles/${article.slug}`)}
          className="block rounded-2xl border border-border/80 bg-card/80 p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{article.title}</h3>
                {article.bookmarked ? <Badge variant="secondary">{t("articles.bookmarked")}</Badge> : null}
                {article.completedAt ? <Badge variant="default">{t("articles.completed")}</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(`articles.progressLabels.${article.status}`)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(article.lastReadAt, locale, t("dashboard.notYet"))}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function LessonProgressList({
  lessons,
  locale,
  link,
  t,
}: {
  lessons: LessonProgressSummary[];
  locale: string;
  link: (href: string) => string;
  t: Awaited<ReturnType<typeof getServerI18n>>["t"];
}) {
  if (lessons.length === 0) {
    return (
      <EmptyState
        title={t("dashboard.noLessonProgress")}
        description={t("dashboard.noLessonProgressDescription")}
        action={
          <Button asChild>
            <Link href={link("/lessons")}>{t("common.browseLessons")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {lessons.map((lesson) => (
        <Link
          key={lesson.lessonId}
          href={link(`/lessons/${lesson.slug}`)}
          className="block rounded-2xl border border-border/80 bg-card/80 p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{lesson.title}</h3>
                <Badge variant="secondary">HSK {lesson.hskLevel}</Badge>
                {lesson.completedAt ? <Badge variant="default">{t("dashboard.completed")}</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("lessons.vocabularyItems", { count: lesson.wordCount })} · {t("lessons.grammarPoints", { count: lesson.grammarCount })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{Math.round(lesson.completionPercent)}%</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(lesson.lastStudiedAt, locale, t("dashboard.notYet"))}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(Math.round(lesson.completionPercent), 4)}%` }}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

export async function DashboardOverview({
  data,
}: {
  data: DashboardData;
}) {
  const { t, link, locale } = await getServerI18n();
  const continueLesson = data.recentLessonProgress.find(
    (lesson) => lesson.completionPercent > 0 && lesson.completionPercent < 100,
  );

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("dashboard.eyebrow")}
        badge={t("common.authenticated")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        actions={
          <HeaderActions
            secondary={
              <HeaderLinkButton href={link("/lessons")} variant="outline">
                {t("common.browseLessons")}
              </HeaderLinkButton>
            }
            primary={
              <>
                {continueLesson ? (
                  <HeaderLinkButton href={link(`/learn/lesson/${continueLesson.lessonId}`)} variant="outline">
                    {t("common.continueLearning")}
                  </HeaderLinkButton>
                ) : null}
                <HeaderLinkButton href={link("/practice/review")}>{t("common.continueReview")}</HeaderLinkButton>
              </>
            }
          />
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={t("dashboard.totalStudied")}
          value={String(data.summary.totalStudied)}
          description={t("dashboard.totalStudiedDescription")}
          icon={<LayoutDashboard className="size-5" />}
        />
        <StatCard
          label={t("dashboard.new")}
          value={String(data.summary.newCount)}
          description={t("dashboard.newDescription")}
          icon={<Sparkles className="size-5" />}
        />
        <StatCard
          label={t("dashboard.learning")}
          value={String(data.summary.learningCount)}
          description={t("dashboard.learningDescription")}
          icon={<BookOpen className="size-5" />}
        />
        <StatCard
          label={t("dashboard.reviewDue")}
          value={String(data.summary.reviewDueCount)}
          description={t("dashboard.reviewDueDescription")}
          accent="warning"
          icon={<RotateCcw className="size-5" />}
        />
        <StatCard
          label={t("dashboard.mastered")}
          value={String(data.summary.masteredCount)}
          description={t("dashboard.masteredDescription")}
          accent="success"
          icon={<CheckCircle2 className="size-5" />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dashboard.wordsToReviewToday")}
          value={String(data.dailyGoalProgress.wordsToReviewToday)}
          description={t("dashboard.wordsToReviewTodayDescription")}
          accent="warning"
          icon={<RotateCcw className="size-5" />}
        />
        <StatCard
          label={t("dashboard.streak")}
          value={String(data.dailyGoalProgress.streakCount)}
          description={t("dashboard.streakDescription")}
          icon={<Flame className="size-5" />}
        />
        <StatCard
          label={t("dashboard.completedToday")}
          value={String(data.dailyGoalProgress.completedToday)}
          description={t("dashboard.completedTodayDescription", { goal: data.dailyGoalProgress.dailyGoal })}
          icon={<Target className="size-5" />}
        />
        <StatCard
          label={t("dashboard.difficultWords")}
          value={String(data.dailyGoalProgress.difficultWordsCount)}
          description={t("dashboard.difficultWordsDescription")}
          accent="warning"
          icon={<Sparkles className="size-5" />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dashboard.totalXp")}
          value={String(data.gamification.totalXp)}
          description={t("dashboard.totalXpDescription")}
          icon={<Sparkles className="size-5" />}
        />
        <StatCard
          label={t("dashboard.currentLevel")}
          value={String(data.gamification.level)}
          description={t("dashboard.currentLevelDescription")}
          icon={<Medal className="size-5" />}
        />
        <StatCard
          label={t("dashboard.achievementCount")}
          value={String(data.gamification.achievements.length)}
          description={t("dashboard.achievementCountDescription")}
          icon={<Trophy className="size-5" />}
        />
        <StatCard
          label={t("dashboard.nextLevelProgress")}
          value={`${data.gamification.progressPercent}%`}
          description={t("dashboard.nextLevelProgressDescription", {
            current: data.gamification.currentXp,
            total: data.gamification.nextLevelXp,
          })}
          icon={<Target className="size-5" />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dashboard.completedArticles")}
          value={String(data.completedArticlesCount)}
          description={t("dashboard.completedArticlesDescription")}
          icon={<BookOpen className="size-5" />}
        />
        <StatCard
          label={t("dashboard.bookmarkedArticles")}
          value={String(data.bookmarkedArticlesCount)}
          description={t("dashboard.bookmarkedArticlesDescription")}
          icon={<Sparkles className="size-5" />}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dashboard.readingCompleted")}
          value={String(data.practiceSummary.readingCompletedCount)}
          description={t("dashboard.readingCompletedDescription")}
          icon={<BookOpenText className="size-5" />}
        />
        <StatCard
          label={t("dashboard.difficultReading")}
          value={String(data.practiceSummary.difficultReadingCount)}
          description={t("dashboard.difficultReadingDescription")}
          accent="warning"
          icon={<RotateCcw className="size-5" />}
        />
        <StatCard
          label={t("dashboard.writingCharacters")}
          value={String(data.practiceSummary.writingCharactersPracticed)}
          description={t("dashboard.writingCharactersDescription")}
          icon={<PenTool className="size-5" />}
        />
        <StatCard
          label={t("dashboard.difficultWriting")}
          value={String(data.practiceSummary.difficultWritingCount)}
          description={t("dashboard.difficultWritingDescription")}
          accent="warning"
          icon={<PenTool className="size-5" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("dashboard.lessonProgress")}</CardTitle>
            <CardDescription>
              {t("dashboard.lessonProgressSummary", {
                completed: data.completedLessonsCount,
                inProgress: data.inProgressLessonsCount,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LessonProgressList lessons={data.recentLessonProgress} locale={locale} link={link} t={t} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("dashboard.dailyGoalWidget")}</CardTitle>
              <CardDescription>{t("dashboard.dailyGoalWidgetDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.goalProgress")}</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {data.dailyGoalProgress.completedToday} / {data.dailyGoalProgress.dailyGoal}
                  </p>
                </div>
                <Button asChild>
                  <Link href={link("/practice/review")}>{t("dashboard.startReview")}</Link>
                </Button>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(
                      (data.dailyGoalProgress.completedToday / data.dailyGoalProgress.dailyGoal) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {data.dailyGoalProgress.remainingToday > 0
                  ? t("dashboard.goalRemaining", { count: data.dailyGoalProgress.remainingToday })
                  : t("dashboard.goalCompleted")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("dashboard.gamificationTitle")}</CardTitle>
              <CardDescription>{t("dashboard.gamificationDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.levelBadge")}</p>
                  <p className="mt-2 text-3xl font-semibold">{t("dashboard.levelValue", { level: data.gamification.level })}</p>
                </div>
                <Badge variant="secondary">{data.gamification.totalXp} XP</Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${data.gamification.progressPercent}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.levelProgress", {
                  current: data.gamification.currentXp,
                  total: data.gamification.nextLevelXp,
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                {data.gamification.achievements.length === 0 ? (
                  <Badge variant="outline">{t("dashboard.noAchievementsYet")}</Badge>
                ) : (
                  data.gamification.achievements.map((achievement) => (
                    <Badge key={`${achievement.key}-${achievement.earnedAt}`} variant="secondary">
                      {t(`achievements.${achievement.key}` as "achievements.first_lesson_completed")}
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("dashboard.reviewReadiness")}</CardTitle>
              <CardDescription>{t("dashboard.reviewReadinessDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">{t("dashboard.dueToday")}</p>
                <p className="mt-2 text-3xl font-semibold text-amber-950">{data.summary.dueTodayCount}</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-4">
                <p className="text-sm font-medium text-rose-900">{t("dashboard.overdueNow")}</p>
                <p className="mt-2 text-3xl font-semibold text-rose-950">{data.summary.overdueCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("dashboard.dailyActivity")}</CardTitle>
              <CardDescription>{t("dashboard.dailyActivityDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl border border-border/80 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flame className="size-4 text-orange-500" />
                  {t("dashboard.currentStreak")}
                </div>
                <p className="mt-2 text-2xl font-semibold">{data.dailyActivity.currentStreakDays}</p>
              </div>
              <div className="rounded-2xl border border-border/80 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="size-4 text-primary" />
                  {t("dashboard.reviewsToday")}
                </div>
                <p className="mt-2 text-2xl font-semibold">{data.dailyActivity.reviewsToday}</p>
              </div>
              <div className="rounded-2xl border border-border/80 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RotateCcw className="size-4 text-emerald-600" />
                  {t("dashboard.last7Days")}
                </div>
                <p className="mt-2 text-2xl font-semibold">{data.dailyActivity.reviewsLast7Days}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("dashboard.activeDays", { count: data.dailyActivity.activeDaysLast7Days })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("dashboard.nextRecommendation")}</CardTitle>
            <CardDescription>{t("dashboard.nextRecommendationDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href={link(data.suggestedNextAction.href)}
              className="block rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 transition-colors hover:bg-primary/[0.1]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{t(data.suggestedNextAction.titleKey)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(data.suggestedNextAction.descriptionKey)}
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </Link>

            {data.nextLessonRecommendation ? (
              <Link
                href={link(`/lessons/${data.nextLessonRecommendation.slug}`)}
                className="block rounded-2xl border border-border/80 bg-card/80 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{data.nextLessonRecommendation.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      HSK {data.nextLessonRecommendation.hskLevel}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
                {data.nextLessonRecommendation.description ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {data.nextLessonRecommendation.description}
                  </p>
                ) : null}
              </Link>
            ) : (
              <EmptyState
                title={t("dashboard.noRecommendation")}
                description={t("dashboard.noRecommendationDescription")}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("dashboard.recommendedArticles")}</CardTitle>
            <CardDescription>{t("dashboard.recommendedArticlesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recommendedArticles.length === 0 ? (
              <EmptyState
                title={t("dashboard.noRecommendedArticles")}
                description={t("dashboard.noRecommendedArticlesDescription")}
              />
            ) : (
              <div className="space-y-3">
                {data.recommendedArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={link(`/articles/${article.slug}`)}
                    className="block rounded-2xl border border-border/80 bg-card/80 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{article.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {article.hskLevel ? `HSK ${article.hskLevel}` : t("common.notAvailable")}
                        </p>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{article.summary}</p>
                    {article.matchingTagNames.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {article.matchingTagNames.map((tagName) => (
                          <Badge key={`${article.id}-${tagName}`} variant="secondary">
                            #{tagName}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("dashboard.recentArticles")}</CardTitle>
            <CardDescription>{t("dashboard.recentArticlesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentArticleList articles={data.recentArticleProgress} locale={locale} link={link} t={t} />
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("dashboard.recentReviewActivity")}</CardTitle>
            <CardDescription>{t("dashboard.recentReviewDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentReviewActivity.length === 0 ? (
              <EmptyState
                title={t("dashboard.noReviewActivity")}
                description={t("dashboard.noReviewActivityDescription")}
              />
            ) : (
              <div className="space-y-3">
                {data.recentReviewActivity.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">{event.word.hanzi}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.word.pinyin} · {event.word.vietnameseMeaning}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          event.result === "correct"
                            ? "default"
                            : event.result === "incorrect"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {event.result}
                      </Badge>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {event.mode.replace("_", " ")} · {formatDateTime(event.reviewedAt, locale, t("dashboard.notYet"))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("dashboard.recentPracticeActivity")}</CardTitle>
            <CardDescription>{t("dashboard.recentPracticeActivityDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentPracticeActivity.length === 0 ? (
              <EmptyState
                title={t("dashboard.noPracticeActivity")}
                description={t("dashboard.noPracticeActivityDescription")}
                action={
                  <Button asChild>
                    <Link href={link("/practice")}>{t("common.practice")}</Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {data.recentPracticeActivity.map((activity) => (
                  <Link
                    key={activity.id}
                    href={
                      activity.practiceType === "writing_character" && activity.word
                        ? link(`/practice/writing/${activity.word.id}`)
                        : activity.practiceType === "reading_sentence"
                          ? link("/practice/reading/sentences")
                          : link("/practice/reading/words")
                    }
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {activity.word?.hanzi ?? activity.sentence?.chineseText ?? t("common.notAvailable")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t(`dashboard.practiceType.${activity.practiceType}` as "dashboard.practiceType.reading_word")} · {t(`dashboard.practiceResult.${activity.result}` as "dashboard.practiceResult.completed")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(activity.createdAt, locale, t("dashboard.notYet"))}
                      </p>
                      <ArrowRight className="ml-auto mt-2 size-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
