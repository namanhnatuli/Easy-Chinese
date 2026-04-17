"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { MultipleChoiceQuestion } from "@/types/domain";

export function MultipleChoicePanel({
  questions,
}: {
  questions: MultipleChoiceQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const question = questions[index];
  const isCorrect = useMemo(
    () => selectedChoice === question.correctChoice,
    [question.correctChoice, selectedChoice],
  );

  return (
    <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-panel">
      <div className="mb-6 flex items-center justify-between text-sm text-slate-300">
        <span>Multiple Choice</span>
        <span>
          {index + 1} / {questions.length}
        </span>
      </div>

      <div className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Question</p>
          <p className="mt-4 text-4xl font-semibold">{question.prompt}</p>
        </div>

        <div className="grid gap-3">
          {question.choices.map((choice) => {
            const active = selectedChoice === choice;

            return (
              <button
                key={choice}
                type="button"
                onClick={() => setSelectedChoice(choice)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                  active
                    ? "border-emerald-300 bg-emerald-400/10 text-emerald-100"
                    : "border-white/10 bg-white/0 text-slate-200 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {selectedChoice ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
            <p className={isCorrect ? "text-emerald-300" : "text-amber-300"}>
              {isCorrect ? "Correct answer." : `Correct answer: ${question.correctChoice}`}
            </p>
            {question.explanation ? <p className="mt-2 text-slate-300">{question.explanation}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <Button
          onClick={() => {
            setIndex((value) => (value + 1) % questions.length);
            setSelectedChoice(null);
          }}
          variant="outline"
          className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          Next question
        </Button>
      </div>
    </section>
  );
}
