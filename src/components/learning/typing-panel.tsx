"use client";

import { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { StudyFeedback, TypingStudyQuestion } from "@/features/learning/types";

export function TypingPanel({
  question,
  currentIndex,
  total,
  value,
  feedback,
  onChange,
  onSubmit,
  onSkip,
  onNext,
}: {
  question: TypingStudyQuestion;
  currentIndex: number;
  total: number;
  value: string;
  feedback: StudyFeedback | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  const isLocked = feedback !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLocked) {
      onNext();
      return;
    }

    onSubmit();
  }

  return (
    <section className="rounded-[2rem] bg-slate-950 text-white">
      <div className="mb-6 flex items-center justify-between text-sm text-slate-300">
        <span>Typing</span>
        <span>
          {currentIndex} / {total}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">
            {question.variant === "meaning_to_pinyin" ? "Meaning → Pinyin" : "Pinyin → Chinese"}
          </p>
          <p className="mt-4 text-2xl font-semibold">{question.prompt}</p>
        </div>

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={question.placeholder}
          aria-label="Type your answer"
          aria-describedby={question.hint ? "typing-question-hint" : undefined}
          disabled={isLocked}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
        />

        {question.hint ? (
          <p id="typing-question-hint" className="text-sm text-slate-400">
            Hint: {question.hint}
          </p>
        ) : null}

        {feedback ? (
          <div
            className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200"
            role="status"
            aria-live="polite"
          >
            <p>{feedback.message}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {!feedback ? (
            <>
              <Button type="submit" variant="secondary" className="bg-white text-slate-950 hover:bg-white/90">
                Check answer
              </Button>
              <Button
                type="button"
                onClick={onSkip}
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                disabled={isLocked}
              >
                Skip
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={onNext}
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Next word
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
