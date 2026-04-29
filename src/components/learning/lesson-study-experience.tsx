"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Keyboard, LogIn, SkipForward, XCircle } from "lucide-react";
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
import type { LessonStudyWord, StudyOutcomeSubmission } from "@/features/learning/types";
import { useStudySession } from "@/features/learning/use-study-session";
import type { ReviewMode } from "@/types/domain";
import { useI18n } from "@/i18n/client";

export function LessonStudyExperience({
  lesson,
  words,
  isAuthenticated,
  signInHref,
  schedulerSettings,
}: {
  lesson: {
    id: string;
    title: string;
    slug: string;
  };
  words: LessonStudyWord[];
  isAuthenticated: boolean;
  signInHref: string;
  schedulerSettings?: Partial<LearningSchedulerSettings> | null;
}) {
  const { t, link } = useI18n();
  const [showAnonymousNotice, setShowAnonymousNotice] = useState(false);
  const newCardDueHints = predictDueHintsForGrades(null, new Date(), schedulerSettings);
  const session = useStudySession({
    items: words,
    onPersistOutcome: async ({ currentItem, result, grade, mode, nextCompletionPercent }) => {
      if (!isAuthenticated) {
        setShowAnonymousNotice(true);
        return;
      }

      const payload: StudyOutcomeSubmission = {
        lessonId: lesson.id,
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
    incorrectMessage: t("learning.needsMoreReview"),
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
        title={t("learning.emptyLesson.title")}
        description={t("learning.emptyLesson.description")}
      />
    );
  }

  if (!session.currentItem) {
    return (
      <section className="rounded-[2rem] border border-border bg-card p-6 text-card-foreground shadow-panel">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("learning.studySession.completeEyebrow")}
            </p>
            <h2 className="mt-2 text-3xl font-semibold">{lesson.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("learning.studySession.completeDescription")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-600 dark:text-emerald-300">{t("learning.studySession.known")}</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-700 dark:text-emerald-200">{session.summary.correct}</p>
            </div>
            <div className="rounded-[1.5rem] bg-amber-500/10 p-4">
              <p className="text-sm text-amber-600 dark:text-amber-300">{t("learning.studySession.needsWork")}</p>
              <p className="mt-2 text-3xl font-semibold text-amber-700 dark:text-amber-200">{session.summary.incorrect}</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-500/10 p-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">{t("learning.reviewSession.skipped")}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-700 dark:text-slate-200">{session.summary.skipped}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground">
              <Link href={link(`/practice/reading/words?lessonId=${lesson.id}`)}>{t("practice.cta.reading")}</Link>
            </Button>
            <Button asChild variant="outline" className="border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground">
              <Link href={link(`/practice/writing?lessonId=${lesson.id}`)}>{t("practice.cta.writing")}</Link>
            </Button>
            <Button
              onClick={() => {
                session.setIndex(0);
                session.setAnswered({});
                session.setFeedback(null);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t("learning.studySession.restart")}
            </Button>
            <Button asChild variant="outline" className="border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground">
              <Link href={link(`/lessons/${lesson.slug}`)}>{t("common.backToLesson")}</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-border bg-card p-5 text-card-foreground shadow-panel sm:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("learning.studySession.eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold">{lesson.title}</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("learning.studySession.description")}
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
          <TabsList className="w-fit bg-muted text-muted-foreground">
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
                  dueHints={newCardDueHints}
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

            <aside className="space-y-4 rounded-[1.75rem] border border-border bg-muted/30 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {t("learning.currentWord")}
                </p>
                {(session.mode === "flashcard" && !session.revealed) || (session.mode !== "flashcard" && !session.feedback) ? (
                  <p className="mt-4 text-2xl font-bold tracking-widest text-muted-foreground/30">???</p>
                ) : (
                  <>
                    <p className="text-hanzi mt-3">{session.currentItem.hanzi}</p>
                    <p className="text-pinyin mt-2 text-muted-foreground">{session.currentItem.pinyin}</p>
                    <p className="text-meaning mt-3 text-muted-foreground">{session.currentItem.vietnameseMeaning}</p>
                  </>
                )}
              </div>

              <div className="rounded-[1.25rem] bg-muted/50 p-4">
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

              <div className="space-y-2 rounded-[1.25rem] bg-muted/50 p-4 text-sm">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  {session.summary.correct} {t("learning.studySession.known")}
                </div>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <XCircle className="size-4" />
                  {session.summary.incorrect} {t("learning.studySession.needsWork")}
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
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

              {!isAuthenticated || showAnonymousNotice ? (
                <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {t("learning.anonymousWarning")}
                  </p>
                  <Button asChild className="mt-3 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link href={signInHref}>
                      <LogIn className="size-4" />
                      {t("learning.signInToSave")}
                    </Link>
                  </Button>
                </div>
              ) : null}
            </aside>
          </div>
        </Tabs>
      </div>
    </section>
  );
}
