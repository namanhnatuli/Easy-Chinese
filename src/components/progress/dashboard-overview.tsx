import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  CalendarClock,
  Flame,
  GraduationCap,
  Headphones,
  Medal,
  PenTool,
  RotateCcw,
} from "lucide-react";

import { DashboardCharts } from "@/components/progress/dashboard-charts";
import { DashboardRangeSelector } from "@/components/progress/dashboard-range-selector";
import { HeaderActions, PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardTimeRange } from "@/features/progress/dashboard.schemas";
import type { DashboardData } from "@/features/progress/types";
import { getMessages } from "@/i18n/messages";
import { getServerI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";

function formatDateTime(value: string | null, locale: string, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ProgressBar({
  value,
  tone = "primary",
}: {
  value: number;
  tone?: "primary" | "warning" | "success";
}) {
  const width = Math.max(0, Math.min(100, value));
  const toneClassName =
    tone === "warning"
      ? "bg-amber-500"
      : tone === "success"
        ? "bg-emerald-500"
        : "bg-primary";

  return (
    <div className="h-2 rounded-full bg-muted">
      <div className={cn("h-2 rounded-full transition-all", toneClassName)} style={{ width: `${width}%` }} />
    </div>
  );
}

function SectionMetricRow({
  label,
  value,
  description,
  badge,
}: {
  label: string;
  value: string;
  description?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium leading-6 text-foreground">{label}</p>
          {badge ? <div className="flex flex-wrap items-center gap-2">{badge}</div> : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-semibold tabular-nums text-foreground sm:text-2xl">{value}</p>
        </div>
      </div>
      {description ? (
        <p className="max-w-xl text-xs leading-6 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function QuickActionLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/80 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="rounded-xl border border-border/70 bg-card p-2 text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function OnboardingStepLink({
  step,
  href,
  title,
  description,
  icon,
}: {
  step: number;
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-start gap-4 rounded-2xl border border-border/70 bg-background/80 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {step}
        </span>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="rounded-xl border border-border/70 bg-card p-2 text-muted-foreground">{icon}</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

export async function DashboardOverview({
  data,
  selectedRange,
}: {
  data: DashboardData;
  selectedRange: DashboardTimeRange;
}) {
  const { t, link, locale } = await getServerI18n();
  const dashboardMessages = (await getMessages(locale)).dashboard;
  const summary = data.progressSummary;
  const vocabulary = data.vocabularyStatusBreakdown;
  const skills = data.skillBreakdown;
  const continueLesson = data.recentLessonProgress.find(
    (lesson) => lesson.completionPercent > 0 && lesson.completionPercent < 100,
  );
  const dailyGoalPercent =
    summary.dailyGoal > 0 ? Math.min((summary.completionToday / summary.dailyGoal) * 100, 100) : 0;
  const masteredPercent = vocabulary.total > 0 ? Math.round((vocabulary.mastered / vocabulary.total) * 100) : 0;
  const isEmptyDashboard =
    !summary.hasActivity &&
    !vocabulary.hasActivity &&
    !skills.hasActivity &&
    !data.recentActivityFeed.hasActivity &&
    data.gamification.achievements.length === 0 &&
    data.completedArticlesCount === 0 &&
    data.bookmarkedArticlesCount === 0;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("dashboard.eyebrow")}
        badge={t("common.authenticated")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        actions={
          <HeaderActions
            primary={<DashboardRangeSelector selectedRange={selectedRange} />}
          />
        }
      />

      <section aria-labelledby="dashboard-summary-heading" className="space-y-4">
        <h2 id="dashboard-summary-heading" className="sr-only">
          {t("dashboard.summaryHeading")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("dashboard.totalStudied")}
            value={String(summary.totalWordsLearned)}
            description={t("dashboard.totalStudiedDescription")}
            icon={<BookOpen className="size-5" />}
          />
          <StatCard
            label={t("dashboard.wordsToReviewToday")}
            value={String(summary.dueToday)}
            description={t("dashboard.wordsToReviewTodayDescription")}
            accent="warning"
            icon={<RotateCcw className="size-5" />}
          />
          <StatCard
            label={t("dashboard.streak")}
            value={String(summary.streakDays)}
            description={t("dashboard.streakDescription")}
            accent="success"
            icon={<Flame className="size-5" />}
          />
          <StatCard
            label={t("dashboard.xpLevel")}
            value={`Lv ${summary.currentLevel} · ${summary.totalXp} XP`}
            description={t("dashboard.xpLevelDescription", { rate: summary.accuracyRate })}
            icon={<Medal className="size-5" />}
          />
        </div>

        {!isEmptyDashboard ? (
          <Card className="border-border/80 bg-card/95">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{t("dashboard.nextActionsTitle")}</CardTitle>
                  <CardDescription>{t("dashboard.nextActionsDescription")}</CardDescription>
                </div>
                <Badge variant={summary.dueToday > 0 ? "warning" : "secondary"}>
                  {summary.dueToday > 0 ? t("dashboard.reviewPriority") : t("dashboard.studyMomentum")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-primary/20 bg-primary/[0.05] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {t("dashboard.wordsToReviewToday")}: {summary.dueToday}
                      </Badge>
                      <Badge variant="outline">
                        {t("dashboard.completedToday")}: {summary.completionToday}/{summary.dailyGoal}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {t(data.suggestedNextAction.titleKey)}
                    </h3>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      {t(data.suggestedNextAction.descriptionKey)}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={link(data.suggestedNextAction.href)}>
                      {t("dashboard.primaryActionLabel")}
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <QuickActionLink
                  href={link("/review")}
                  title={t("dashboard.ctaReviewNow")}
                  description={t("dashboard.ctaReviewNowBody")}
                  icon={<RotateCcw className="size-4" />}
                />
                <QuickActionLink
                  href={link("/lessons")}
                  title={t("dashboard.ctaContinueLessons")}
                  description={
                    continueLesson
                      ? `${continueLesson.title} · ${Math.round(continueLesson.completionPercent)}%`
                      : t("dashboard.ctaContinueLessonsBody")
                  }
                  icon={<GraduationCap className="size-4" />}
                />
                <QuickActionLink
                  href={link("/practice/reading")}
                  title={t("dashboard.ctaPracticeReading")}
                  description={t("dashboard.ctaPracticeReadingBody")}
                  icon={<BookOpenText className="size-4" />}
                />
                <QuickActionLink
                  href={link("/practice/listening")}
                  title={t("dashboard.ctaPracticeListening")}
                  description={t("dashboard.ctaPracticeListeningBody")}
                  icon={<Headphones className="size-4" />}
                />
                <QuickActionLink
                  href={link("/practice/writing")}
                  title={t("dashboard.ctaPracticeWriting")}
                  description={t("dashboard.ctaPracticeWritingBody")}
                  icon={<PenTool className="size-4" />}
                />
              </div>

              <div className="xl:col-span-2">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 opacity-80">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-border/70 bg-card p-2 text-muted-foreground">
                      <CalendarClock className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t("dashboard.ctaStatisticsDetail")}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {t("dashboard.ctaStatisticsDetailBody")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{t("dashboard.comingSoon")}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>

      {isEmptyDashboard ? (
        <section
          aria-labelledby="dashboard-empty-heading"
          className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"
        >
          <EmptyState
            title={t("dashboard.emptyTitle")}
            description={t("dashboard.emptyDescription")}
            visual={<GraduationCap className="size-8 text-primary" />}
            action={
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={link("/lessons")}>{t("dashboard.emptyStartLessons")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={link("/practice/reading")}>{t("dashboard.emptyStartPractice")}</Link>
                </Button>
              </div>
            }
          />

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle id="dashboard-empty-heading">{t("dashboard.emptyGuideTitle")}</CardTitle>
              <CardDescription>{t("dashboard.emptyGuideDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                <OnboardingStepLink
                  step={1}
                  href={link("/lessons")}
                  title={t("dashboard.emptyStartLessons")}
                  description={t("dashboard.emptyLessonsBody")}
                  icon={<GraduationCap className="size-4" />}
                />
                <OnboardingStepLink
                  step={2}
                  href={link("/practice/reading")}
                  title={t("dashboard.emptyStartPractice")}
                  description={t("dashboard.emptyPracticeBody")}
                  icon={<BookOpenText className="size-4" />}
                />
                <OnboardingStepLink
                  step={3}
                  href={link("/practice/writing")}
                  title={t("dashboard.emptyStartWriting")}
                  description={t("dashboard.emptyWritingBody")}
                  icon={<PenTool className="size-4" />}
                />
                <OnboardingStepLink
                  step={4}
                  href={link("/review")}
                  title={t("dashboard.emptyReviewDaily")}
                  description={t("dashboard.emptyReviewDailyBody")}
                  icon={<RotateCcw className="size-4" />}
                />
              </ol>
            </CardContent>
          </Card>
        </section>
      ) : (
        <>
          <section aria-labelledby="dashboard-charts-heading" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 id="dashboard-charts-heading" className="text-lg font-semibold text-foreground">
                  {t("dashboard.chartSectionTitle")}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {t("dashboard.chartSectionDescription")}
                </p>
              </div>
              <Badge variant="outline">
                {t(`dashboard.rangeOptions.${selectedRange}` as "dashboard.rangeOptions.30d")}
              </Badge>
            </div>

            <DashboardCharts
              locale={locale}
              messages={dashboardMessages}
              timeSeries={data.progressTimeSeries}
              comparison={data.progressComparison}
              summary={data.progressSummary}
              vocabulary={data.vocabularyStatusBreakdown}
              skillBreakdown={data.skillBreakdown}
            />
          </section>

          <div className="grid gap-4">
            <section aria-labelledby="dashboard-details-heading" className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
              <h2 id="dashboard-details-heading" className="sr-only">{t("dashboard.detailsHeading")}</h2>

              <Card className="border-border/80 bg-card/95">
                <CardHeader>
                  <CardTitle>{t("dashboard.progressTitle")}</CardTitle>
                  <CardDescription>{t("dashboard.progressDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SectionMetricRow
                      label={t("dashboard.goalProgress")}
                      value={`${summary.completionToday} / ${summary.dailyGoal}`}
                      description={
                        summary.completionToday >= summary.dailyGoal
                          ? t("dashboard.goalCompleted")
                          : t("dashboard.goalRemaining", {
                              count: Math.max(summary.dailyGoal - summary.completionToday, 0),
                            })
                      }
                      badge={
                        <Badge variant={dailyGoalPercent >= 100 ? "success" : "secondary"}>
                          {t("dashboard.completedToday")}
                        </Badge>
                      }
                    />
                    <SectionMetricRow
                      label={t("dashboard.accuracyRate")}
                      value={`${summary.accuracyRate}%`}
                      description={t("dashboard.accuracyRateDescription")}
                      badge={<Badge variant="warning">{t("dashboard.focusBadge")}</Badge>}
                    />
                  </div>
                  <ProgressBar value={dailyGoalPercent} tone={dailyGoalPercent >= 100 ? "success" : "primary"} />
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/95">
                <CardHeader>
                  <CardTitle>{t("dashboard.articlesPanelTitle")}</CardTitle>
                  <CardDescription>{t("dashboard.articlesPanelDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SectionMetricRow
                    label={t("dashboard.completedArticles")}
                    value={String(data.completedArticlesCount)}
                    description={t("dashboard.completedArticlesDescription")}
                  />
                  <SectionMetricRow
                    label={t("dashboard.bookmarkedArticles")}
                    value={String(data.bookmarkedArticlesCount)}
                    description={t("dashboard.bookmarkedArticlesDescription")}
                  />
                  <div className="space-y-3">
                    {data.recentArticleProgress.length === 0 ? (
                      <EmptyState
                        title={t("dashboard.noArticleProgress")}
                        description={t("dashboard.noArticleProgressDescription")}
                      />
                    ) : (
                      data.recentArticleProgress.slice(0, 2).map((article) => (
                        <Link
                          key={article.articleId}
                          href={link(`/articles/${article.slug}`)}
                          className="block rounded-2xl border border-border/70 bg-background/70 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{article.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t(`articles.progressLabels.${article.status}`)}
                              </p>
                            </div>
                            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="dashboard-activity-heading" className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
              <h2 id="dashboard-activity-heading" className="sr-only">{t("dashboard.recentActivityTitle")}</h2>

              <Card className="border-border/80 bg-card/95">
                <CardHeader>
                  <CardTitle>{t("dashboard.recentActivityTitle")}</CardTitle>
                  <CardDescription>{t("dashboard.recentActivityDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.recentActivityFeed.items.length === 0 ? (
                    <EmptyState
                      title={t("dashboard.noRecentActivity")}
                      description={t("dashboard.noRecentActivityDescription")}
                    />
                  ) : (
                    <div className="space-y-3">
                      {data.recentActivityFeed.items.slice(0, 6).map((item) => {
                        const typeLabel =
                          item.type === "review"
                            ? t("dashboard.activityTypes.review")
                            : item.type === "reading"
                              ? t("dashboard.activityTypes.reading")
                              : item.type === "listening"
                                ? t("dashboard.activityTypes.listening")
                              : item.type === "writing"
                                ? t("dashboard.activityTypes.writing")
                                : item.type === "article"
                                  ? t("dashboard.activityTypes.article")
                                  : t("dashboard.activityTypes.lesson");
                        const detailLabel =
                          item.type === "article"
                            ? t(`articles.progressLabels.${item.detail}` as "articles.progressLabels.completed")
                            : item.type === "review"
                              ? item.detail === "correct"
                                ? t("dashboard.reviewResult.correct")
                                : item.detail === "incorrect"
                                  ? t("dashboard.reviewResult.incorrect")
                                  : t("dashboard.reviewResult.skipped")
                              : item.type === "lesson"
                                ? item.detail
                                : t(`dashboard.practiceResult.${item.detail}` as "dashboard.practiceResult.completed");

                        return (
                          <div
                            key={`${item.type}-${item.occurredAt}-${item.label}`}
                            className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background/70 p-4"
                          >
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{typeLabel}</Badge>
                                <Badge
                                  variant={
                                    item.type === "review" && item.detail === "incorrect"
                                      ? "warning"
                                      : item.type === "article" && item.detail === "completed"
                                        ? "success"
                                        : "outline"
                                  }
                                >
                                  {detailLabel}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(item.occurredAt, locale, t("dashboard.notYet"))}
                                </p>
                              </div>
                            </div>
                            {item.href ? (
                              <Button asChild size="sm" variant="ghost">
                                <Link href={link(item.href)}>
                                  <span className="sr-only">{t("dashboard.openActivity")}</span>
                                  <ArrowRight className="size-4" />
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/95">
                <CardHeader>
                  <CardTitle>{t("dashboard.achievementsPanelTitle")}</CardTitle>
                  <CardDescription>{t("dashboard.achievementsPanelDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-3xl border border-border/70 bg-background/60 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t("dashboard.currentLevel")}</p>
                        <p className="mt-2 text-3xl font-semibold">
                          {t("dashboard.levelValue", { level: data.gamification.level })}
                        </p>
                      </div>
                      <Badge variant="secondary">{data.gamification.totalXp} XP</Badge>
                    </div>
                    <div className="mt-4 space-y-2">
                      <ProgressBar value={data.gamification.progressPercent} />
                      <p className="text-xs leading-5 text-muted-foreground">
                        {t("dashboard.levelProgress", {
                          current: data.gamification.currentXp,
                          total: data.gamification.nextLevelXp,
                        })}
                      </p>
                    </div>
                  </div>

                  {data.gamification.achievements.length === 0 ? (
                    <EmptyState
                      title={t("dashboard.noAchievementsYet")}
                      description={t("dashboard.noAchievementsDescription")}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.gamification.achievements.map((achievement) => (
                        <Badge key={`${achievement.key}-${achievement.earnedAt}`} variant="secondary">
                          {t(`achievements.${achievement.key}` as "achievements.first_lesson_completed")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="dashboard-side-heading">
              <h2 id="dashboard-side-heading" className="sr-only">
                {t("dashboard.sidePanelsHeading")}
              </h2>

              <Card className="border-border/80 bg-card/95">
                <CardHeader>
                  <CardTitle>{t("dashboard.secondaryStatsTitle")}</CardTitle>
                  <CardDescription>{t("dashboard.secondaryStatsDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">{t("dashboard.vocabularyMemoryTitle")}</h3>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {t("dashboard.vocabularyMemoryDescription")}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <SectionMetricRow label={t("dashboard.new")} value={String(vocabulary.new)} />
                      <SectionMetricRow label={t("dashboard.learning")} value={String(vocabulary.learning)} />
                      <SectionMetricRow label={t("dashboard.reviewDue")} value={String(vocabulary.review)} />
                      <SectionMetricRow
                        label={t("dashboard.mastered")}
                        value={String(vocabulary.mastered)}
                        badge={<Badge variant="success">{masteredPercent}%</Badge>}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">{t("dashboard.skillsTitle")}</h3>
                      <p className="text-xs leading-5 text-muted-foreground">{t("dashboard.skillsDescription")}</p>
                    </div>
                    <div className="space-y-3">
                      <SectionMetricRow label={t("dashboard.skillReviews")} value={String(skills.reviews)} />
                      <SectionMetricRow label={t("dashboard.skillReading")} value={String(skills.reading)} />
                      <SectionMetricRow label={t("dashboard.skillListening")} value={String(skills.listening)} />
                      <SectionMetricRow label={t("dashboard.skillWriting")} value={String(skills.writing)} />
                      <SectionMetricRow label={t("dashboard.skillLessons")} value={String(skills.lessons)} />
                      <SectionMetricRow label={t("dashboard.skillArticles")} value={String(skills.articles)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
