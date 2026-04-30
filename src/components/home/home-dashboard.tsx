import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BookText,
  Flame,
  GraduationCap,
  Newspaper,
  PenTool,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HomePageData } from "@/features/home/queries";
import { getServerI18n } from "@/i18n/server";

function ProgressBar({
  value,
  tone = "primary",
}: {
  value: number;
  tone?: "primary" | "emerald" | "amber";
}) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const barClassName =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div className="h-2 rounded-full bg-muted">
      <div className={`h-2 rounded-full transition-all ${barClassName}`} style={{ width: `${clampedValue}%` }} />
    </div>
  );
}

function ActionCard({
  title,
  body,
  meta,
  href,
  ctaLabel,
  icon,
  prominent = false,
}: {
  title: string;
  body: string;
  meta?: string;
  href: string;
  ctaLabel: string;
  icon: ReactNode;
  prominent?: boolean;
}) {
  return (
    <Card className={prominent ? "border-primary/30 bg-primary/5" : "border-border/80"}>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className={prominent ? "rounded-2xl bg-primary/10 p-3 text-primary" : "rounded-2xl bg-muted p-3 text-foreground"}>
            {icon}
          </div>
          {meta ? <Badge variant={prominent ? "default" : "secondary"}>{meta}</Badge> : null}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="leading-6">{body}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full justify-between">
          <Link href={href}>
            {ctaLabel}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ShortcutCard({
  title,
  href,
  icon,
}: {
  title: string;
  href: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="surface-panel flex min-h-28 flex-col gap-3 border border-border/80 p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex size-10 items-center justify-center rounded-2xl bg-muted">{icon}</div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{title}</span>
        <ArrowRight className="size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

export async function HomeDashboard({ data }: { data: HomePageData }) {
  const { t, link } = await getServerI18n();
  const name = data.user?.displayName?.trim() || t("home.friend");
  const reviewHref = data.isAuthenticated
    ? link("/review")
    : `${link("/auth/sign-in")}?next=${encodeURIComponent(link("/review"))}`;
  const continueLessonHref = data.recentActivity.continueLesson
    ? data.recentActivity.continueLesson.completionPercent > 0
      ? link(`/learn/lesson/${data.recentActivity.continueLesson.lessonId}`)
      : link(`/lessons/${data.recentActivity.continueLesson.slug}`)
    : link("/lessons");
  const continueArticleHref = data.recentActivity.lastArticle
    ? link(`/articles/${data.recentActivity.lastArticle.slug}`)
    : link("/articles");

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("home.dashboardEyebrow")}
        badge={data.isAuthenticated ? undefined : t("home.guestBadge")}
        title={
          data.isAuthenticated
            ? t("home.welcomeAuthenticated", { name })
            : t("home.welcomeAnonymous")
        }
        description={
          data.isAuthenticated ? t("home.dashboardDescription") : t("home.guestDescription")
        }
        actions={
          data.isAuthenticated ? (
            <Button asChild size="lg">
              <Link href={reviewHref}>
                {t("home.primaryReviewCta")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href={`${link("/auth/sign-in")}?next=${encodeURIComponent(link("/"))}`}>
                {t("home.signInToSaveProgress")}
              </Link>
            </Button>
          )
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/80">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{t("home.dailyFocusTitle")}</Badge>
              {data.isAuthenticated && data.summary ? (
                <Badge variant="warning">
                  {t("home.dailyFocusDue", { count: data.summary.wordsToReviewToday })}
                </Badge>
              ) : null}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">
                {data.isAuthenticated && data.summary
                  ? t("home.dailyFocusHeadline", { count: data.summary.wordsToReviewToday })
                  : t("home.guestFocusHeadline")}
              </CardTitle>
              <CardDescription className="max-w-3xl leading-6">
                {data.isAuthenticated && data.summary
                  ? data.summary.wordsToReviewToday > 0
                    ? t("home.dailyFocusReviewBody")
                    : t("home.dailyFocusNoDueBody")
                  : t("home.guestFocusBody")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {data.isAuthenticated && data.summary ? (
              <>
                <StatCard
                  label={t("dashboard.streak")}
                  value={`${data.summary.streakCount}`}
                  description={t("dashboard.streakDescription")}
                  icon={<Flame className="size-5 text-orange-500" />}
                  accent="warning"
                  variant="compact"
                />
                <StatCard
                  label={t("dashboard.totalXp")}
                  value={`${data.summary.totalXp}`}
                  description={t("dashboard.totalXpDescription")}
                  icon={<Sparkles className="size-5 text-primary" />}
                  variant="compact"
                />
                <StatCard
                  label={t("home.goalCompactLabel")}
                  value={`${data.summary.completedToday}/${data.summary.dailyGoal}`}
                  description={t("dashboard.completedTodayDescription", { goal: data.summary.dailyGoal })}
                  icon={<Target className="size-5 text-emerald-600" />}
                  accent="success"
                  variant="compact"
                />
              </>
            ) : (
              <>
                <StatCard
                  label={t("home.levelFocusEyebrow")}
                  value={t("navigation.lessons.label")}
                  description={t("home.levelFocusBody")}
                  icon={<GraduationCap className="size-5 text-primary" />}
                  variant="compact"
                />
                <StatCard
                  label={t("home.learningFlowTitle")}
                  value={t("common.practice")}
                  description={t("home.learningFlowBody")}
                  icon={<BookText className="size-5 text-primary" />}
                  variant="compact"
                />
                <StatCard
                  label={t("dashboard.wordsToReviewToday")}
                  value="0"
                  description={t("home.signInToSaveProgress")}
                  icon={<RotateCcw className="size-5 text-primary" />}
                  variant="compact"
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-slate-950 text-white">
          <CardHeader className="gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {t("home.dailyGoalProgressTitle")}
            </p>
            <CardTitle className="text-2xl text-white">
              {data.isAuthenticated && data.summary
                ? t("dashboard.levelValue", { level: data.summary.level })
                : t("home.levelFocusTitle")}
            </CardTitle>
            <CardDescription className="text-slate-300">
              {data.isAuthenticated && data.summary
                ? t("dashboard.levelProgress", {
                    current: data.summary.currentXp,
                    total: data.summary.nextLevelXp,
                  })
                : t("home.learningFlowBody")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar
              value={data.isAuthenticated && data.summary ? data.summary.levelProgressPercent : 0}
              tone="amber"
            />
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-300">
                {data.isAuthenticated && data.summary
                  ? t("dashboard.goalRemaining", { count: data.summary.remainingToday })
                  : t("home.signInToSaveProgress")}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{t("home.sections.todayLearningTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("home.sections.todayLearningDescription")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            title={t("home.actions.reviewTitle")}
            body={
              data.isAuthenticated
                ? t("home.actions.reviewBody")
                : t("home.actions.reviewGuestBody")
            }
            meta={
              data.isAuthenticated
                ? t("home.dailyFocusDue", { count: data.reviewQueueCount })
                : undefined
            }
            href={reviewHref}
            ctaLabel={t("home.actions.reviewCta")}
            icon={<RotateCcw className="size-5" />}
            prominent
          />
          <ActionCard
            title={t("home.actions.lessonTitle")}
            body={
              data.recentActivity.continueLesson
                ? `${data.recentActivity.continueLesson.title} · HSK ${data.recentActivity.continueLesson.hskLevel}`
                : t("home.actions.lessonFallbackBody")
            }
            meta={
              data.recentActivity.continueLesson
                ? `${data.recentActivity.continueLesson.completionPercent}%`
                : undefined
            }
            href={continueLessonHref}
            ctaLabel={t("common.continueLearning")}
            icon={<GraduationCap className="size-5" />}
          />
          <ActionCard
            title={t("home.actions.writingTitle")}
            body={t("home.actions.writingBody")}
            href={link("/practice/writing")}
            ctaLabel={t("home.actions.writingCta")}
            icon={<PenTool className="size-5" />}
          />
          <ActionCard
            title={t("home.actions.readingTitle")}
            body={t("home.actions.readingBody")}
            href={link("/practice/reading")}
            ctaLabel={t("home.actions.readingCta")}
            icon={<BookOpen className="size-5" />}
          />
        </div>
      </section>

      {data.isAuthenticated && data.summary && data.stats ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">{t("home.sections.progressTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("home.sections.progressDescription")}</p>
            </div>
            <Button asChild variant="outline">
              <Link href={link("/dashboard")}>{t("home.viewDetails")}</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label={t("dashboard.totalStudied")}
              value={`${data.stats.totalWordsLearned}`}
              description={t("dashboard.totalStudiedDescription")}
              icon={<BookText className="size-5 text-primary" />}
            />
            <StatCard
              label={t("dashboard.wordsToReviewToday")}
              value={`${data.stats.wordsDueToday}`}
              description={t("dashboard.wordsToReviewTodayDescription")}
              icon={<RotateCcw className="size-5 text-primary" />}
              accent="warning"
            />
            <StatCard
              label={t("dashboard.completedToday")}
              value={`${data.stats.wordsCompletedToday}`}
              description={t("dashboard.completedTodayDescription", { goal: data.summary.dailyGoal })}
              icon={<Target className="size-5 text-emerald-600" />}
              accent="success"
            />
            <StatCard
              label={t("dashboard.difficultWords")}
              value={`${data.stats.difficultWordsCount}`}
              description={t("dashboard.difficultWordsDescription")}
              icon={<Flame className="size-5 text-orange-500" />}
            />
            <StatCard
              label={t("dashboard.writingCharacters")}
              value={`${data.stats.writingPracticeCount}`}
              description={t("dashboard.writingCharactersDescription")}
              icon={<PenTool className="size-5 text-primary" />}
            />
          </div>
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>{t("home.progressBarTitle")}</CardTitle>
              <CardDescription>{t("home.progressBarBody")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProgressBar value={Math.round((data.summary.completedToday / Math.max(data.summary.dailyGoal, 1)) * 100)} tone="emerald" />
              <p className="text-sm text-muted-foreground">
                {data.summary.completedToday}/{data.summary.dailyGoal}
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1.1fr]">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{t("home.sections.continueTitle")}</CardTitle>
            <CardDescription>{t("home.sections.continueDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl bg-muted/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t("home.actions.lessonTitle")}
              </p>
              <p className="mt-2 text-sm font-semibold">
                {data.recentActivity.continueLesson
                  ? data.recentActivity.continueLesson.title
                  : data.isAuthenticated
                    ? t("home.emptyContinueLesson")
                    : t("home.guestContinueLesson")}
              </p>
              <div className="mt-4">
                <Button asChild size="sm" variant="outline">
                  <Link href={continueLessonHref}>{t("common.continueLearning")}</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-3xl bg-muted/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t("navigation.articles.label")}
              </p>
              <p className="mt-2 text-sm font-semibold">
                {data.recentActivity.lastArticle
                  ? data.recentActivity.lastArticle.title
                  : data.isAuthenticated
                    ? t("home.emptyContinueArticle")
                    : t("home.guestContinueArticle")}
              </p>
              <div className="mt-4">
                <Button asChild size="sm" variant="outline">
                  <Link href={continueArticleHref}>{t("common.continueLearning")}</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{t("home.recentWordsTitle")}</CardTitle>
            <CardDescription>{t("home.sections.continueDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentActivity.recentWords.length > 0 ? (
              data.recentActivity.recentWords.map((word) => (
                <Link
                  key={word.id}
                  href={link(`/vocabulary/${word.slug}`)}
                  className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div>
                    <p className="font-semibold">{word.hanzi}</p>
                    <p className="text-sm text-muted-foreground">{word.vietnameseMeaning}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{word.pinyin}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {data.isAuthenticated ? t("home.emptyRecentWords") : t("home.guestRecentWords")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{t("home.sections.shortcutsTitle")}</CardTitle>
            <CardDescription>{t("home.sections.shortcutsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ShortcutCard title={t("common.review")} href={reviewHref} icon={<RotateCcw className="size-5" />} />
            <ShortcutCard title={t("navigation.practice.label")} href={link("/practice/reading")} icon={<BookOpen className="size-5" />} />
            <ShortcutCard title={t("home.actions.writingTitle")} href={link("/practice/writing")} icon={<PenTool className="size-5" />} />
            <ShortcutCard title={t("navigation.lessons.label")} href={link("/lessons")} icon={<GraduationCap className="size-5" />} />
            <ShortcutCard title={t("navigation.articles.label")} href={link("/articles")} icon={<Newspaper className="size-5" />} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{t("home.sections.guideTitle")}</CardTitle>
            <CardDescription>{t("home.sections.guideDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                step: "1",
                title: t("home.guide.step1Title"),
                body: t("home.guide.step1Body"),
                href: link("/lessons"),
              },
              {
                step: "2",
                title: t("home.guide.step2Title"),
                body: t("home.guide.step2Body"),
                href: link("/practice/reading"),
              },
              {
                step: "3",
                title: t("home.guide.step3Title"),
                body: t("home.guide.step3Body"),
                href: link("/practice/writing"),
              },
              {
                step: "4",
                title: t("home.guide.step4Title"),
                body: t("home.guide.step4Body"),
                href: reviewHref,
              },
            ].map((item) => (
              <Link
                key={item.step}
                href={item.href}
                className="flex items-start gap-4 rounded-3xl border border-border/70 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {item.step}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/80">
            <CardHeader className="flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>{t("home.sections.recommendedLessonsTitle")}</CardTitle>
                <CardDescription>{t("home.sections.recommendedLessonsDescription")}</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={link("/lessons")}>{t("home.seeMore")}</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.recommendedLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={link(`/lessons/${lesson.slug}`)}
                  className="rounded-3xl border border-border/70 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{`HSK ${lesson.hskLevel}`}</Badge>
                    {lesson.topic ? <Badge variant="outline">{lesson.topic.name}</Badge> : null}
                  </div>
                  <p className="mt-3 font-semibold">{lesson.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lesson.description || t("lessons.description")}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle>{t("home.sections.recommendedArticlesTitle")}</CardTitle>
                <CardDescription>{t("home.sections.recommendedArticlesDescription")}</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={link("/articles")}>{t("home.seeMore")}</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.recommendedArticles.map((article) => (
                <Link
                  key={article.id}
                  href={link(`/articles/${article.slug}`)}
                  className="rounded-3xl border border-border/70 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {article.hskLevel ? <Badge variant="secondary">{`HSK ${article.hskLevel}`}</Badge> : null}
                    {article.matchingTagNames.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 font-semibold">{article.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {data.isAuthenticated ? null : (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">{t("home.signInToSaveProgress")}</p>
              <p className="text-sm text-muted-foreground">{t("home.guestDescription")}</p>
            </div>
            <Button asChild>
              <Link href={`${link("/auth/sign-in")}?next=${encodeURIComponent(link("/"))}`}>
                {t("common.signIn")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
