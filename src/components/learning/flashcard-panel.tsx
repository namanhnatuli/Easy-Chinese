"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { LearningCard } from "@/types/domain";

export function FlashcardPanel({ cards }: { cards: LearningCard[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const card = cards[index];

  return (
    <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-panel">
      <div className="mb-6 flex items-center justify-between text-sm text-slate-300">
        <span>Flashcard</span>
        <span>
          {index + 1} / {cards.length}
        </span>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Prompt</p>
        <p className="mt-4 font-chinese text-5xl font-semibold">{card.prompt}</p>
        <p className="mt-3 text-lg text-slate-300">{card.romanization}</p>

        {revealed ? (
          <div className="mt-6 space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Answer</p>
            <p className="text-2xl font-medium text-emerald-100">{card.answer}</p>
            {card.supportingText ? (
              <p className="text-sm text-slate-400">{card.supportingText}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-400">Flip when you have the answer in mind.</p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          onClick={() => setRevealed((value) => !value)}
          variant="secondary"
          className="bg-white text-slate-950 hover:bg-white/90"
        >
          {revealed ? "Hide answer" : "Reveal answer"}
        </Button>
        <Button
          onClick={() => {
            setIndex((value) => (value + 1) % cards.length);
            setRevealed(false);
          }}
          variant="outline"
          className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          Next card
        </Button>
      </div>
    </section>
  );
}
