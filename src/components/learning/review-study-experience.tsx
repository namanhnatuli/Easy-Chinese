"use client";

import Link from "next/link";
import { CheckCircle2, Keyboard, RotateCcw, SkipForward, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AiExplanationCard } from "@/components/ai/ai-explanation-card";
import { FlashcardPanel } from "@/components/learning/flashcard-panel";
import { MultipleChoicePanel } from "@/components/learning/multiple-choice-panel";
import { TypingPanel } from "@/components/learning/typing-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { predictDueHintsForGrades } from "@/features/memory/spaced-repetition";
import type { LearningSchedulerSettings } from "@/features/memory/spaced-repetition";
import type { DueReviewItem } from "@/features/progress/types";
import type { StudyOutcomeSubmission } from "@/features/learning/types";
import type { ReviewMode } from "@/types/domain";
import { useStudySession } from "@/features/learning/use-study-session";
import { useI18n } from "@/i18n/client";

function formatDateTime(value: string | null, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ReviewStudyExperience({
  items,
  schedulerSettings,
}: {
  items: DueReviewItem[];
  schedulerSettings?: Partial<LearningSchedulerSettings> | null;
}) {
  const { t, link, locale } = useI18n();
  const reviewDueHints = items.length
    ? predictDueHintsForGrades(
        {
          schedulerType: items[0]?.schedulerType ?? "sm2",
          state: items[0]?.memoryState ?? "new",
          easeFactor: items[0]?.easeFactor ?? 2.5,
          intervalDays: items[0]?.intervalDays ?? 0,
          dueAt: items[0]?.dueAt ?? null,
          reps: items[0]?.reps ?? 0,
          lapses: items[0]?.lapses ?? 0,
          learningStepIndex: items[0]?.learningStepIndex ?? 0,
          fsrsStability: items[0]?.fsrsStability ?? null,
          fsrsDifficulty: items[0]?.fsrsDifficulty ?? null,
          fsrsRetrievability: items[0]?.fsrsRetrievability ?? null,
          scheduledDays: items[0]?.scheduledDays ?? 0,
          elapsedDays: items[0]?.elapsedDays ?? 0,
          lastReviewedAt: items[0]?.lastReviewedAt ?? null,
          lastGrade: items[0]?.lastGrade ?? null,
        },
        new Date(),
        schedulerSettings,
      )
    : undefined;
  const session = useStudySession({
    items,
    onPersistOutcome: async ({ currentItem, result, grade, mode, nextCompletionPercent }) => {
      const payload: StudyOutcomeSubmission = {
        wordId: currentItem.id,
        mode,
        result,
        grade,
        completionPercent: nextCompletionPercent,
      };

      const response = await fetch("/api/learning/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        toast.error(body?.message ?? t("learning.progressSaveFailed"));
      }
    },
    incorrectMessage: t("learning.reviewSoon"),
    flashcardMessages: {
      again: t("learning.gradeFeedback.again"),
      hard: t("learning.gradeFeedback.hard"),
      good: t("learning.gradeFeedback.good"),
      easy: t("learning.gradeFeedback.easy"),
    },
  });

  if (session.totalItems === 0) {
    return (
      <EmptyState
        title={t("learning.emptyReview.title")}
        description={t("learning.emptyReview.description")}
      />
    );
  }

  if (!session.currentItem) {
    return (
      <section className="surface-panel p-6">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("learning.reviewSession.completeEyebrow")}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-foreground">{t("learning.reviewSession.completeTitle")}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("learning.reviewSession.completeDescription")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("learning.reviewSession.correct")}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{session.summary.correct}</p>
            </div>
            <div className="rounded-[1.5rem] bg-amber-500/10 p-4">
              <p className="text-sm text-amber-600 dark:text-amber-400">{t("learning.reviewSession.incorrect")}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{session.summary.incorrect}</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-500/10 p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t("learning.reviewSession.skipped")}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{session.summary.skipped}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={link("/practice/reading/sentences")}>{t("practice.cta.reading")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={link("/practice/writing")}>{t("practice.cta.writing")}</Link>
            </Button>
            <Button
              onClick={() => {
                session.setIndex(0);
                session.setAnswered({});
                session.setFeedback(null);
              }}
            >
              {t("learning.reviewSession.restart")}
            </Button>
            <Button asChild variant="outline">
              <Link href={link("/dashboard")}>{t("learning.reviewSession.backToDashboard")}</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-panel p-5 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("learning.reviewSession.eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold text-foreground">{t("learning.reviewSession.title")}</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("learning.reviewSession.description")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{session.index + 1} / {session.totalItems}</Badge>
            <Badge variant="secondary">{session.completionPercent}%</Badge>
            <Badge variant="outline">{session.isSaving ? t("learning.saving") : t("learning.autosaves")}</Badge>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.max(((session.index + 1) / session.totalItems) * 100, 6)}%` }}
          />
        </div>

        <Tabs value={session.mode} onValueChange={(value) => session.setMode(value as ReviewMode)} className="flex flex-col gap-6">
          <TabsList className="w-fit bg-secondary/50 text-muted-foreground">
            <TabsTrigger value="flashcard" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
              {t("learning.flashcard")}
            </TabsTrigger>
            <TabsTrigger value="multiple_choice" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
              {t("learning.multipleChoice")}
            </TabsTrigger>
            <TabsTrigger value="typing" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
              {t("learning.typing")}
            </TabsTrigger>
          </TabsList>

          <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
            <div>
              {session.mode === "flashcard" && session.flashcardPrompt ? (
                <FlashcardPanel
                  prompt={session.flashcardPrompt}
                  currentIndex={session.index + 1}
                  total={session.totalItems}
                  revealed={session.revealed}
                  feedback={session.feedback}
                  dueHints={
                    session.currentItem
                      ? predictDueHintsForGrades(
                          {
                            schedulerType: session.currentItem.schedulerType,
                            state: session.currentItem.memoryState,
                            easeFactor: session.currentItem.easeFactor,
                            intervalDays: session.currentItem.intervalDays,
                            dueAt: session.currentItem.dueAt,
                            reps: session.currentItem.reps,
                            lapses: session.currentItem.lapses,
                            learningStepIndex: session.currentItem.learningStepIndex,
                            fsrsStability: session.currentItem.fsrsStability,
                            fsrsDifficulty: session.currentItem.fsrsDifficulty,
                            fsrsRetrievability: session.currentItem.fsrsRetrievability,
                            scheduledDays: session.currentItem.scheduledDays,
                            elapsedDays: session.currentItem.elapsedDays,
                            lastReviewedAt: session.currentItem.lastReviewedAt,
                            lastGrade: session.currentItem.lastGrade,
                          },
                          new Date(),
                          schedulerSettings,
                        )
                      : reviewDueHints
                  }
                  onReveal={() => session.setRevealed(true)}
                  onGrade={session.handleFlashcardGrade}
                  onNext={session.goToNextItem}
                />
              ) : null}

              {session.mode === "multiple_choice" && session.multipleChoiceQuestion ? (
                <MultipleChoicePanel
                  question={session.multipleChoiceQuestion}
                  currentIndex={session.index + 1}
                  total={session.totalItems}
                  selectedChoice={session.selectedChoice}
                  feedback={session.feedback}
                  onSelect={session.setSelectedChoice}
                  onSubmit={session.handleMultipleChoiceSubmit}
                  onSkip={() => session.handleOutcome("skipped", t("learning.skippedForNow"))}
                  onNext={session.goToNextItem}
                />
              ) : null}

              {session.mode === "typing" && session.typingQuestion ? (
                <TypingPanel
                  question={session.typingQuestion}
                  currentIndex={session.index + 1}
                  total={session.totalItems}
                  value={session.typingValue}
                  feedback={session.feedback}
                  onChange={session.setTypingValue}
                  onSubmit={session.handleTypingSubmit}
                  onSkip={() => session.handleOutcome("skipped", t("learning.skippedForNow"))}
                  onNext={session.goToNextItem}
                />
              ) : null}
            </div>

            <aside className="space-y-4 rounded-[1.75rem] border bg-muted/10 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {t("learning.currentWord")}
                </p>
                <p className="text-hanzi mt-3 text-foreground">{session.currentItem.hanzi}</p>
                <p className="text-pinyin mt-2 text-muted-foreground">{session.currentItem.pinyin}</p>
                <p className="text-meaning mt-3 text-muted-foreground">{session.currentItem.vietnameseMeaning}</p>
              </div>

              <div className="rounded-[1.25rem] bg-secondary/50 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <RotateCcw className="size-4" />
                  {t("learning.reviewStatus")}
                </div>
                <p className="mt-3">{t("learning.status", { value: session.currentItem.memoryState })}</p>
                <p className="mt-1">
                  {t("learning.due", {
                    value: formatDateTime(
                      session.currentItem.dueAt,
                      locale,
                      t("learning.reviewStatusFallbacks.noPriorReview"),
                    ),
                  })}
                </p>
                <p className="mt-1">
                  {t("learning.lastReviewed", {
                    value: formatDateTime(
                      session.currentItem.lastReviewedAt,
                      locale,
                      t("learning.reviewStatusFallbacks.noPriorReview"),
                    ),
                  })}
                </p>
                <p className="mt-1">
                  {t("learning.interval", {
                    days: session.currentItem.intervalDays,
                    streak: session.currentItem.reps,
                  })}
                </p>
                <p className="mt-1">{t("learning.lapses", { count: session.currentItem.lapses })}</p>
              </div>

              <div className="rounded-[1.25rem] bg-secondary/50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Keyboard className="size-4" />
                  {t("learning.shortcuts")}
                </div>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>{t("learning.flashcardShortcut")}</p>
                  <p>{t("learning.multipleChoiceShortcut")}</p>
                  <p>{t("learning.enterShortcut")}</p>
                  <p>{t("learning.spaceShortcut")}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-[1.25rem] bg-secondary/50 p-4 text-sm">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  {session.summary.correct} {t("learning.reviewSession.correct")}
                </div>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <XCircle className="size-4" />
                  {session.summary.incorrect} {t("learning.reviewSession.incorrect")}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <SkipForward className="size-4" />
                  {session.summary.skipped} {t("learning.reviewSession.skipped")}
                </div>
              </div>

              {session.feedback?.result === "incorrect" ? (
                <AiExplanationCard
                  payload={{ kind: "word", wordId: session.currentItem.id }}
                  title={t("ai.explanation.wordTitle", { value: session.currentItem.hanzi })}
                  description={t("ai.explanation.incorrectDescription")}
                  triggerLabel={t("ai.explanation.open")}
                  autoLoad
                />
              ) : null}
            </aside>
          </div>
        </Tabs>
      </div>
    </section>
  );
}
