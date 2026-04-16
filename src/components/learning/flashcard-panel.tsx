"use client";

import { useState } from "react";

import type { LearningCard } from "@/types/domain";

export function FlashcardPanel({ cards }: { cards: LearningCard[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const card = cards[index];

  return (
    <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl">
      <div className="mb-6 flex items-center justify-between text-sm text-slate-300">
        <span>Flashcard</span>
        <span>
          {index + 1} / {cards.length}
        </span>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Prompt</p>
        <p className="mt-4 text-5xl font-semibold">{card.prompt}</p>
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
        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
        >
          {revealed ? "Hide answer" : "Reveal answer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIndex((value) => (value + 1) % cards.length);
            setRevealed(false);
          }}
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white"
        >
          Next card
        </button>
      </div>
    </section>
  );
}
