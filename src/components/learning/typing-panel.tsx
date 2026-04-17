"use client";

import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { TypingQuestion } from "@/types/domain";

export function TypingPanel({ questions }: { questions: TypingQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const question = questions[index];
  const normalizedValue = value.trim().toLowerCase();
  const normalizedAnswer = question.expectedAnswer.trim().toLowerCase();
  const isCorrect = useMemo(
    () => normalizedValue === normalizedAnswer,
    [normalizedAnswer, normalizedValue],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-panel">
      <div className="mb-6 flex items-center justify-between text-sm text-slate-300">
        <span>Typing</span>
        <span>
          {index + 1} / {questions.length}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Prompt</p>
          <p className="mt-4 text-2xl font-semibold">{question.prompt}</p>
          {question.hint ? <p className="mt-2 text-sm text-slate-400">Hint: {question.hint}</p> : null}
        </div>

        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={question.placeholder}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
        />

        {submitted ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
            <p className={isCorrect ? "text-emerald-300" : "text-amber-300"}>
              {isCorrect ? "Correct." : `Expected: ${question.expectedAnswer}`}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="secondary" className="bg-white text-slate-950 hover:bg-white/90">
            Check answer
          </Button>
          <Button
            onClick={() => {
              setIndex((value) => (value + 1) % questions.length);
              setValue("");
              setSubmitted(false);
            }}
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Next prompt
          </Button>
        </div>
      </form>
    </section>
  );
}
