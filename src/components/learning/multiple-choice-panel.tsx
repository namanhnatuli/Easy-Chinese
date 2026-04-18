"use client";

import { Button } from "@/components/ui/button";
import type {
  MultipleChoiceStudyQuestion,
  StudyFeedback,
} from "@/features/learning/types";

export function MultipleChoicePanel({
  question,
  currentIndex,
  total,
  selectedChoice,
  feedback,
  onSelect,
  onSubmit,
  onSkip,
  onNext,
}: {
  question: MultipleChoiceStudyQuestion;
  currentIndex: number;
  total: number;
  selectedChoice: string | null;
  feedback: StudyFeedback | null;
  onSelect: (choice: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  const isLocked = feedback !== null;

  return (
    <section className="rounded-[2rem] bg-slate-950 text-white">
      <div className="mb-6 flex items-center justify-between text-sm text-slate-300">
        <span>Multiple choice</span>
        <span>
          {currentIndex} / {total}
        </span>
      </div>

      <div className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">
            {question.variant === "hanzi_to_meaning" ? "Chinese → Vietnamese" : "Vietnamese → Chinese"}
          </p>
          <p className="mt-4 text-4xl font-semibold">{question.prompt}</p>
        </div>

        <div
          className="grid gap-3"
          role="radiogroup"
          aria-label="Multiple choice answers"
        >
          {question.choices.map((choice, index) => {
            const active = selectedChoice === choice;

            return (
              <button
                key={choice}
                type="button"
                onClick={() => onSelect(choice)}
                role="radio"
                aria-checked={active}
                aria-disabled={isLocked}
                disabled={isLocked}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                  active
                    ? "border-emerald-300 bg-emerald-400/10 text-emerald-100"
                    : "border-white/10 bg-white/0 text-slate-200 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <span className="mr-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                  {index + 1}
                </span>
                {choice}
              </button>
            );
          })}
        </div>

        {feedback ? (
          <div
            className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200"
            role="status"
            aria-live="polite"
          >
            <p>{feedback.message}</p>
            <p className="mt-2 text-slate-300">{question.explanation}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {!feedback ? (
          <>
            <Button
              onClick={onSubmit}
              variant="secondary"
              className="bg-white text-slate-950 hover:bg-white/90"
              disabled={!selectedChoice}
            >
              Check answer
            </Button>
            <Button
              onClick={onSkip}
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Skip
            </Button>
          </>
        ) : (
          <Button
            onClick={onNext}
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Next word
          </Button>
        )}
      </div>
    </section>
  );
}
