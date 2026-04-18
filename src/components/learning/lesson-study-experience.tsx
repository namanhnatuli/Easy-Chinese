"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Keyboard, LogIn, SkipForward, XCircle } from "lucide-react";
import { toast } from "sonner";

import { FlashcardPanel } from "@/components/learning/flashcard-panel";
import { MultipleChoicePanel } from "@/components/learning/multiple-choice-panel";
import { TypingPanel } from "@/components/learning/typing-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LessonStudyWord, StudyOutcomeSubmission } from "@/features/learning/types";
import { useStudySession } from "@/features/learning/use-study-session";
import type { ReviewMode } from "@/types/domain";

export function LessonStudyExperience({
  lesson,
  words,
  isAuthenticated,
  signInHref,
}: {
  lesson: {
    id: string;
    title: string;
    slug: string;
  };
  words: LessonStudyWord[];
  isAuthenticated: boolean;
  signInHref: string;
}) {
  const [showAnonymousNotice, setShowAnonymousNotice] = useState(false);
  const session = useStudySession({
    items: words,
    onPersistOutcome: async ({ currentItem, result, mode, nextCompletionPercent }) => {
    if (!isAuthenticated) {
      setShowAnonymousNotice(true);
      return;
    }

    const payload: StudyOutcomeSubmission = {
      lessonId: lesson.id,
      wordId: currentItem.id,
      mode,
      result,
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
      toast.error(body?.message ?? "Progress could not be saved.");
    }
    },
    incorrectMessage: "Marked for more review.",
  });

  if (session.totalItems === 0) {
    return (
      <EmptyState
        title="This lesson has no study words yet"
        description="Return to the lesson overview and attach published vocabulary before starting a learner session."
      />
    );
  }

  if (!session.currentItem) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-6 text-white shadow-panel">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Session complete
            </p>
            <h2 className="mt-2 text-3xl font-semibold">{lesson.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              You finished the lesson study pass. Review the summary below or restart the session.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] bg-emerald-400/10 p-4">
              <p className="text-sm text-emerald-200">Known</p>
              <p className="mt-2 text-3xl font-semibold">{session.summary.correct}</p>
            </div>
            <div className="rounded-[1.5rem] bg-amber-400/10 p-4">
              <p className="text-sm text-amber-200">Needs work</p>
              <p className="mt-2 text-3xl font-semibold">{session.summary.incorrect}</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-400/10 p-4">
              <p className="text-sm text-slate-200">Skipped</p>
              <p className="mt-2 text-3xl font-semibold">{session.summary.skipped}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                session.setIndex(0);
                session.setAnswered({});
                session.setFeedback(null);
              }}
              className="bg-white text-slate-950 hover:bg-white/90"
            >
              Restart lesson
            </Button>
            <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href={`/lessons/${lesson.slug}`}>Back to lesson</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-panel sm:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Study session
            </p>
            <h2 className="text-3xl font-semibold">{lesson.title}</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Move through the lesson in study order. Switch modes whenever you want without losing your place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{session.index + 1} / {session.totalItems}</Badge>
            <Badge variant="secondary">{session.completionPercent}% complete</Badge>
            <Badge variant="outline">{session.isSaving ? "Saving…" : "Progress autosaves"}</Badge>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${Math.max(((session.index + 1) / session.totalItems) * 100, 6)}%` }}
          />
        </div>

        <Tabs value={session.mode} onValueChange={(value) => session.setMode(value as ReviewMode)} className="flex flex-col gap-6">
          <TabsList className="w-fit bg-white/10 text-slate-300">
            <TabsTrigger value="flashcard" className="data-[state=active]:bg-white data-[state=active]:text-slate-950">
              Flashcard
            </TabsTrigger>
            <TabsTrigger value="multiple_choice" className="data-[state=active]:bg-white data-[state=active]:text-slate-950">
              Multiple choice
            </TabsTrigger>
            <TabsTrigger value="typing" className="data-[state=active]:bg-white data-[state=active]:text-slate-950">
              Typing
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
                  onReveal={() => session.setRevealed(true)}
                  onKnow={() => session.handleFlashcardAction("correct")}
                  onDontKnow={() => session.handleFlashcardAction("incorrect")}
                  onSkip={() => session.handleFlashcardAction("skipped")}
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
                  onSkip={() => session.handleOutcome("skipped", "Skipped for now.")}
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
                  onSkip={() => session.handleOutcome("skipped", "Skipped for now.")}
                  onNext={session.goToNextItem}
                />
              ) : null}
            </div>

            <aside className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Current word
                </p>
                <p className="text-hanzi mt-3">{session.currentItem.hanzi}</p>
                <p className="text-pinyin mt-2 text-slate-300">{session.currentItem.pinyin}</p>
                <p className="text-meaning mt-3 text-slate-300">{session.currentItem.vietnameseMeaning}</p>
              </div>

              <div className="rounded-[1.25rem] bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Keyboard className="size-4" />
                  Shortcuts
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <p>`1/2/3` score flashcards</p>
                  <p>`1-4` choose multiple-choice answers</p>
                  <p>`Enter` check or continue</p>
                  <p>`Space` reveal flashcards</p>
                </div>
              </div>

              <div className="space-y-2 rounded-[1.25rem] bg-black/20 p-4 text-sm">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="size-4" />
                  {session.summary.correct} known
                </div>
                <div className="flex items-center gap-2 text-amber-300">
                  <XCircle className="size-4" />
                  {session.summary.incorrect} needs work
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <SkipForward className="size-4" />
                  {session.summary.skipped} skipped
                </div>
              </div>

              {!isAuthenticated || showAnonymousNotice ? (
                <div className="rounded-[1.25rem] border border-amber-300/20 bg-amber-400/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">
                    Studying works anonymously, but long-term progress is not saved.
                  </p>
                  <Button asChild className="mt-3 bg-white text-slate-950 hover:bg-white/90">
                    <Link href={signInHref}>
                      <LogIn className="size-4" />
                      Sign in to save progress
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
