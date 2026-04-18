import Link from "next/link";
import { ArrowRight, BookOpen, CalendarClock, CheckCircle2, Flame, LayoutDashboard, RotateCcw, Sparkles } from "lucide-react";

import { HeaderActions, HeaderLinkButton, PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData, LessonProgressSummary } from "@/features/progress/types";

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function LessonProgressList({
  lessons,
}: {
  lessons: LessonProgressSummary[];
}) {
  if (lessons.length === 0) {
    return (
      <EmptyState
        title="No lesson progress yet"
        description="Start a lesson to unlock completion tracking, recent study history, and review recommendations."
        action={
          <Button asChild>
            <Link href="/lessons">Browse lessons</Link>
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
          href={`/lessons/${lesson.slug}`}
          className="block rounded-2xl border border-border/80 bg-card/80 p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{lesson.title}</h3>
                <Badge variant="secondary">HSK {lesson.hskLevel}</Badge>
                {lesson.completedAt ? <Badge variant="default">Completed</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {lesson.wordCount} words · {lesson.grammarCount} grammar points
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{Math.round(lesson.completionPercent)}%</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(lesson.lastStudiedAt)}
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

export function DashboardOverview({
  data,
}: {
  data: DashboardData;
}) {
  const continueLesson = data.recentLessonProgress.find(
    (lesson) => lesson.completionPercent > 0 && lesson.completionPercent < 100,
  );

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Dashboard"
        badge="Authenticated"
        title="Your study progress"
        description="See what is due now, how your lesson path is moving, and where to focus next."
        actions={
          <HeaderActions
            secondary={
              <HeaderLinkButton href="/lessons" variant="outline">
                Browse lessons
              </HeaderLinkButton>
            }
            primary={
              <>
                {continueLesson ? (
                  <HeaderLinkButton href={`/learn/lesson/${continueLesson.lessonId}`} variant="outline">
                    Continue learning
                  </HeaderLinkButton>
                ) : null}
                <HeaderLinkButton href="/review">
                  Continue review
                </HeaderLinkButton>
              </>
            }
          />
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total studied"
          value={String(data.summary.totalStudied)}
          description="Words with saved progress"
          icon={<LayoutDashboard className="size-5" />}
        />
        <StatCard
          label="New"
          value={String(data.summary.newCount)}
          description="Saved but barely touched"
          icon={<Sparkles className="size-5" />}
        />
        <StatCard
          label="Learning"
          value={String(data.summary.learningCount)}
          description="Still in active rotation"
          icon={<BookOpen className="size-5" />}
        />
        <StatCard
          label="Review due"
          value={String(data.summary.reviewDueCount)}
          description="Ready to review now"
          accent="warning"
          icon={<RotateCcw className="size-5" />}
        />
        <StatCard
          label="Mastered"
          value={String(data.summary.masteredCount)}
          description="Stable long-term words"
          accent="success"
          icon={<CheckCircle2 className="size-5" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>Lesson progress</CardTitle>
            <CardDescription>
              {data.completedLessonsCount} completed · {data.inProgressLessonsCount} in progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LessonProgressList lessons={data.recentLessonProgress} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>Review readiness</CardTitle>
              <CardDescription>What needs attention before the day ends.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Due today</p>
                <p className="mt-2 text-3xl font-semibold text-amber-950">{data.summary.dueTodayCount}</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-4">
                <p className="text-sm font-medium text-rose-900">Overdue now</p>
                <p className="mt-2 text-3xl font-semibold text-rose-950">{data.summary.overdueCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>Daily activity</CardTitle>
              <CardDescription>Small momentum signals from recent review work.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl border border-border/80 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flame className="size-4 text-orange-500" />
                  Current streak
                </div>
                <p className="mt-2 text-2xl font-semibold">{data.dailyActivity.currentStreakDays} days</p>
              </div>
              <div className="rounded-2xl border border-border/80 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="size-4 text-primary" />
                  Reviews today
                </div>
                <p className="mt-2 text-2xl font-semibold">{data.dailyActivity.reviewsToday}</p>
              </div>
              <div className="rounded-2xl border border-border/80 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RotateCcw className="size-4 text-emerald-600" />
                  Last 7 days
                </div>
                <p className="mt-2 text-2xl font-semibold">{data.dailyActivity.reviewsLast7Days}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Active on {data.dailyActivity.activeDaysLast7Days} day(s)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>Recent review activity</CardTitle>
            <CardDescription>Latest saved answers from your study sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentReviewActivity.length === 0 ? (
              <EmptyState
                title="No review activity yet"
                description="Review events will appear here after you finish a lesson or clear items from the review queue."
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
                        {event.mode.replace("_", " ")} · {formatDateTime(event.reviewedAt)}
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
            <CardTitle>Recent studied lessons</CardTitle>
            <CardDescription>Jump back into the path you touched most recently.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentLessonProgress.length === 0 ? (
              <EmptyState
                title="No studied lessons yet"
                description="Open a published lesson and start a study session to build your learning history."
                action={
                  <Button asChild>
                    <Link href="/lessons">Browse lessons</Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {data.recentLessonProgress.map((lesson) => (
                  <Link
                    key={lesson.lessonId}
                    href={`/learn/lesson/${lesson.lessonId}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-semibold">{lesson.title}</p>
                      <p className="text-sm text-muted-foreground">
                        HSK {lesson.hskLevel} · {Math.round(lesson.completionPercent)}% complete
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
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
