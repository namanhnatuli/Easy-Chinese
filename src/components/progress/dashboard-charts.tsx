"use client";

import { useMemo } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getMessages } from "@/i18n/messages";

import type { AppLocale } from "@/i18n/config";
import type {
  UserProgressComparisonMetric,
  UserProgressPeriodComparison,
  UserProgressSummary,
  UserProgressTimeSeries,
  UserSkillBreakdown,
  UserVocabularyStatusBreakdown,
} from "@/features/progress/dashboard.types";

type DashboardMessages = Awaited<ReturnType<typeof getMessages>>["dashboard"];

const CHART_COLORS = {
  reviews: "#0f766e",
  newWords: "#ea580c",
  xp: "#2563eb",
  reading: "#0891b2",
  writing: "#ca8a04",
  lessons: "#7c3aed",
  correct: "#16a34a",
  incorrect: "#dc2626",
  vocabularyNew: "#94a3b8",
  vocabularyLearning: "#f59e0b",
  vocabularyReview: "#0ea5e9",
  vocabularyMastered: "#22c55e",
} as const;

function formatCompactDate(date: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function formatTooltipValue(value: number | string | ReadonlyArray<string | number> | undefined) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return value ?? "0";
}

function ComparisonBadge({
  metric,
  messages,
  previousPeriodLabel,
}: {
  metric: UserProgressComparisonMetric;
  messages: DashboardMessages;
  previousPeriodLabel: string;
}) {
  if (metric.trend === "none") {
    return <Badge variant="outline">{messages.comparisonNoPreviousData}</Badge>;
  }

  if (metric.trend === "neutral") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Minus className="size-3" />
        <span>{messages.comparisonNoChange}</span>
      </Badge>
    );
  }

  const isUp = metric.trend === "up";
  const Icon = isUp ? TrendingUp : TrendingDown;
  const label = isUp ? messages.comparisonUp : messages.comparisonDown;
  const amount = Math.abs(metric.percentageChange ?? 0);

  return (
    <Badge variant={isUp ? "success" : "warning"} className="gap-1">
      <Icon className="size-3" />
      <span>{label.replace("{value}", String(amount)).replace("{period}", previousPeriodLabel)}</span>
    </Badge>
  );
}

function ComparisonStat({
  label,
  value,
  metric,
  messages,
  previousPeriodLabel,
}: {
  label: string;
  value: number | string;
  metric: UserProgressComparisonMetric;
  messages: DashboardMessages;
  previousPeriodLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
        </div>
        <ComparisonBadge metric={metric} messages={messages} previousPeriodLabel={previousPeriodLabel} />
      </div>
    </div>
  );
}

function MetricSummary({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-border/70 bg-background/70 text-foreground";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function DashboardCharts({
  locale,
  messages,
  timeSeries,
  comparison,
  summary,
  vocabulary,
  skillBreakdown,
}: {
  locale: AppLocale;
  messages: DashboardMessages;
  timeSeries: UserProgressTimeSeries;
  comparison: UserProgressPeriodComparison;
  summary: UserProgressSummary;
  vocabulary: UserVocabularyStatusBreakdown;
  skillBreakdown: UserSkillBreakdown;
}) {
  const activityData = useMemo(
    () =>
      timeSeries.points.map((point) => ({
        date: formatCompactDate(point.date, locale),
        reviews: point.reviews,
        newWords: point.newWords,
        xpEarned: point.xpEarned,
      })),
    [locale, timeSeries.points],
  );

  const skillTrendData = useMemo(
    () =>
      timeSeries.points.map((point) => ({
        date: formatCompactDate(point.date, locale),
        reviews: point.reviews,
        reading: point.readingCompleted,
        writing: point.writingCompleted,
        lessons: point.lessonsCompleted,
      })),
    [locale, timeSeries.points],
  );

  const accuracyData = useMemo(
    () =>
      timeSeries.points.map((point) => ({
        date: formatCompactDate(point.date, locale),
        correct: point.correctReviews,
        incorrect: point.incorrectReviews,
      })),
    [locale, timeSeries.points],
  );

  const vocabularyData = useMemo(
    () => [
      {
        name: messages.new,
        value: vocabulary.new,
        color: CHART_COLORS.vocabularyNew,
      },
      {
        name: messages.learning,
        value: vocabulary.learning,
        color: CHART_COLORS.vocabularyLearning,
      },
      {
        name: messages.reviewDue,
        value: vocabulary.review,
        color: CHART_COLORS.vocabularyReview,
      },
      {
        name: messages.mastered,
        value: vocabulary.mastered,
        color: CHART_COLORS.vocabularyMastered,
      },
    ],
    [messages, vocabulary],
  );

  const rangeTotals = useMemo(
    () =>
      timeSeries.points.reduce(
        (acc, point) => {
          acc.reviews += point.reviews;
          acc.newWords += point.newWords;
          acc.xpEarned += point.xpEarned;
          acc.correct += point.correctReviews;
          acc.incorrect += point.incorrectReviews;
          acc.reading += point.readingCompleted;
          acc.writing += point.writingCompleted;
          acc.lessons += point.lessonsCompleted;
          return acc;
        },
        {
          reviews: 0,
          newWords: 0,
          xpEarned: 0,
          correct: 0,
          incorrect: 0,
          reading: 0,
          writing: 0,
          lessons: 0,
        },
      ),
    [timeSeries.points],
  );

  const answeredReviews = rangeTotals.correct + rangeTotals.incorrect;
  const rangeAccuracy =
    answeredReviews > 0 ? Math.round((rangeTotals.correct / answeredReviews) * 100) : summary.accuracyRate;
  const previousPeriodLabel = messages.previousPeriodLabels[comparison.previousPeriodLabel];
  const activitySummaryText = `${messages.skillReviews}: ${rangeTotals.reviews}, ${messages.chartNewWords}: ${rangeTotals.newWords}, ${messages.chartXp}: ${rangeTotals.xpEarned}`;
  const skillSummaryText = `${messages.skillReading}: ${rangeTotals.reading}, ${messages.skillWriting}: ${rangeTotals.writing}, ${messages.skillLessons}: ${rangeTotals.lessons}, ${messages.skillReviews}: ${rangeTotals.reviews}`;
  const accuracySummaryText = `${messages.chartCorrect}: ${rangeTotals.correct}, ${messages.chartIncorrect}: ${rangeTotals.incorrect}, ${messages.accuracyChartTitle}: ${rangeAccuracy}%`;

  return (
    <div className="space-y-4">
      <Card className="border-border/80 bg-card/95">
        <CardHeader>
          <CardTitle>{messages.comparisonSectionTitle}</CardTitle>
          <CardDescription>{messages.comparisonSectionDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ComparisonStat
            label={messages.skillReviews}
            value={comparison.current.reviews}
            metric={comparison.metrics.reviews}
            messages={messages}
            previousPeriodLabel={previousPeriodLabel}
          />
          <ComparisonStat
            label={messages.chartNewWords}
            value={comparison.current.newWords}
            metric={comparison.metrics.newWords}
            messages={messages}
            previousPeriodLabel={previousPeriodLabel}
          />
          <ComparisonStat
            label={messages.chartXp}
            value={comparison.current.xpEarned}
            metric={comparison.metrics.xpEarned}
            messages={messages}
            previousPeriodLabel={previousPeriodLabel}
          />
          <ComparisonStat
            label={messages.accuracyChartTitle}
            value={`${comparison.current.accuracyRate}%`}
            metric={comparison.metrics.accuracyRate}
            messages={messages}
            previousPeriodLabel={previousPeriodLabel}
          />
          <ComparisonStat
            label={messages.skillReading}
            value={comparison.current.readingCompleted}
            metric={comparison.metrics.readingCompleted}
            messages={messages}
            previousPeriodLabel={previousPeriodLabel}
          />
          <ComparisonStat
            label={messages.skillWriting}
            value={comparison.current.writingCompleted}
            metric={comparison.metrics.writingCompleted}
            messages={messages}
            previousPeriodLabel={previousPeriodLabel}
          />
          <ComparisonStat
            label={messages.skillLessons}
            value={comparison.current.lessonsCompleted}
            metric={comparison.metrics.lessonsCompleted}
            messages={messages}
            previousPeriodLabel={previousPeriodLabel}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 bg-card/95">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{messages.activityTrendTitle}</CardTitle>
                <CardDescription>{messages.activityTrendDescription}</CardDescription>
              </div>
              <ComparisonBadge
                metric={comparison.metrics.reviews}
                messages={messages}
                previousPeriodLabel={previousPeriodLabel}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricSummary label={messages.skillReviews} value={rangeTotals.reviews} />
              <MetricSummary label={messages.chartNewWords} value={rangeTotals.newWords} />
              <MetricSummary label={messages.chartXp} value={rangeTotals.xpEarned} />
            </div>
          </CardHeader>
          <CardContent>
            {timeSeries.hasActivity ? (
              <div aria-label={activitySummaryText} className="h-56 w-full sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis tickLine={false} axisLine={false} width={32} />
                    <Tooltip formatter={formatTooltipValue} />
                    <Bar dataKey="reviews" fill={CHART_COLORS.reviews} radius={[6, 6, 0, 0]} name={messages.skillReviews} />
                    <Bar dataKey="newWords" fill={CHART_COLORS.newWords} radius={[6, 6, 0, 0]} name={messages.chartNewWords} />
                    <Line type="monotone" dataKey="xpEarned" stroke={CHART_COLORS.xp} strokeWidth={2.5} dot={false} name={messages.chartXp} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title={messages.chartEmptyTitle} description={messages.chartEmptyDescription} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle>{messages.vocabularyStatusChartTitle}</CardTitle>
              <CardDescription>{messages.vocabularyStatusChartDescription}</CardDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricSummary label={messages.new} value={vocabulary.new} />
              <MetricSummary label={messages.mastered} value={vocabulary.mastered} tone="success" />
            </div>
          </CardHeader>
          <CardContent>
            {vocabulary.total > 0 ? (
              <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr] sm:items-center">
                <div className="h-52 w-full sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={formatTooltipValue} />
                      <Pie
                        data={vocabularyData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={3}
                      >
                        {vocabularyData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {vocabularyData.map((entry) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="size-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm font-medium">{entry.name}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title={messages.chartEmptyTitle} description={messages.vocabularyEmptyDescription} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{messages.skillActivityChartTitle}</CardTitle>
                <CardDescription>{messages.skillActivityChartDescription}</CardDescription>
              </div>
              <ComparisonBadge
                metric={comparison.metrics.lessonsCompleted}
                messages={messages}
                previousPeriodLabel={previousPeriodLabel}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricSummary label={messages.skillReading} value={skillBreakdown.reading} />
              <MetricSummary label={messages.skillWriting} value={skillBreakdown.writing} />
              <MetricSummary label={messages.skillLessons} value={skillBreakdown.lessons} />
              <MetricSummary label={messages.skillReviews} value={skillBreakdown.reviews} />
            </div>
          </CardHeader>
          <CardContent>
            {timeSeries.hasActivity ? (
              <div aria-label={skillSummaryText} className="h-56 w-full sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillTrendData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis tickLine={false} axisLine={false} width={32} />
                    <Tooltip formatter={formatTooltipValue} />
                    <Bar dataKey="reviews" stackId="skills" fill={CHART_COLORS.reviews} name={messages.skillReviews} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reading" stackId="skills" fill={CHART_COLORS.reading} name={messages.skillReading} />
                    <Bar dataKey="writing" stackId="skills" fill={CHART_COLORS.writing} name={messages.skillWriting} />
                    <Bar dataKey="lessons" stackId="skills" fill={CHART_COLORS.lessons} name={messages.skillLessons} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title={messages.chartEmptyTitle} description={messages.skillEmptyDescription} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{messages.accuracyChartTitle}</CardTitle>
                <CardDescription>{messages.accuracyChartDescription}</CardDescription>
              </div>
              <Badge variant={rangeAccuracy >= 80 ? "success" : rangeAccuracy >= 60 ? "secondary" : "warning"}>
                {rangeAccuracy}%
              </Badge>
            </div>
            <ComparisonBadge
              metric={comparison.metrics.accuracyRate}
              messages={messages}
              previousPeriodLabel={previousPeriodLabel}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {answeredReviews > 0 ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricSummary label={messages.chartCorrect} value={rangeTotals.correct} tone="success" />
                  <MetricSummary label={messages.chartIncorrect} value={rangeTotals.incorrect} tone="warning" />
                </div>
                <div aria-label={accuracySummaryText} className="h-52 w-full sm:h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={accuracyData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={20} />
                      <YAxis tickLine={false} axisLine={false} width={32} />
                      <Tooltip formatter={formatTooltipValue} />
                      <Line type="monotone" dataKey="correct" stroke={CHART_COLORS.correct} strokeWidth={2.5} dot={false} name={messages.chartCorrect} />
                      <Line type="monotone" dataKey="incorrect" stroke={CHART_COLORS.incorrect} strokeWidth={2.5} dot={false} name={messages.chartIncorrect} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <EmptyState title={messages.chartEmptyTitle} description={messages.accuracyEmptyDescription} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
