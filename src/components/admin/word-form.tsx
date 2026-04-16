"use client";

import { useMemo, useState } from "react";
import { z } from "zod";

import type { Word } from "@/types/domain";

const wordSchema = z.object({
  simplified: z.string().min(1, "Simplified Chinese is required."),
  traditional: z.string().optional(),
  pinyin: z.string().min(1, "Pinyin is required."),
  hanViet: z.string().optional(),
  vietnameseMeaning: z.string().min(1, "Vietnamese meaning is required."),
  hskLevel: z.coerce.number().int().min(1).max(9),
  notes: z.string().optional(),
  isPublished: z.boolean(),
});

type WordFormValues = z.infer<typeof wordSchema>;

const defaultValues: WordFormValues = {
  simplified: "",
  traditional: "",
  pinyin: "",
  hanViet: "",
  vietnameseMeaning: "",
  hskLevel: 1,
  notes: "",
  isPublished: false,
};

export function WordForm({ initialWord }: { initialWord?: Partial<Word> }) {
  const [values, setValues] = useState<WordFormValues>({
    simplified: initialWord?.simplified ?? defaultValues.simplified,
    traditional: initialWord?.traditional ?? defaultValues.traditional,
    pinyin: initialWord?.pinyin ?? defaultValues.pinyin,
    hanViet: initialWord?.hanViet ?? defaultValues.hanViet,
    vietnameseMeaning:
      initialWord?.vietnameseMeaning ?? defaultValues.vietnameseMeaning,
    hskLevel: initialWord?.hskLevel ?? defaultValues.hskLevel,
    notes: initialWord?.notes ?? defaultValues.notes,
    isPublished: initialWord?.isPublished ?? defaultValues.isPublished,
  });
  const [submitted, setSubmitted] = useState(false);

  const parsed = useMemo(() => wordSchema.safeParse(values), [values]);

  return (
    <form className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Vocabulary Entry
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Word details</h2>
        <p className="mt-1 text-sm text-slate-600">
          This first version is validation-ready and can be wired to a server action later.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Simplified</span>
          <input
            value={values.simplified}
            onChange={(event) =>
              setValues((current) => ({ ...current, simplified: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Traditional</span>
          <input
            value={values.traditional}
            onChange={(event) =>
              setValues((current) => ({ ...current, traditional: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Pinyin</span>
          <input
            value={values.pinyin}
            onChange={(event) =>
              setValues((current) => ({ ...current, pinyin: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Han-Viet</span>
          <input
            value={values.hanViet}
            onChange={(event) =>
              setValues((current) => ({ ...current, hanViet: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Vietnamese meaning</span>
          <input
            value={values.vietnameseMeaning}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                vietnameseMeaning: event.target.value,
              }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">HSK level</span>
          <input
            type="number"
            min={1}
            max={9}
            value={values.hskLevel}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                hskLevel: Number(event.target.value),
              }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
          <input
            type="checkbox"
            checked={values.isPublished}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                isPublished: event.target.checked,
              }))
            }
          />
          <span className="text-sm font-medium text-slate-700">Published</span>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Notes</span>
          <textarea
            rows={4}
            value={values.notes}
            onChange={(event) =>
              setValues((current) => ({ ...current, notes: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
          />
        </label>
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {parsed.success ? (
            <p className="text-emerald-700">Validation passed. Wire this to a server action next.</p>
          ) : (
            <ul className="space-y-1 text-rose-700">
              {parsed.error.issues.map((issue) => (
                <li key={`${issue.path.join(".")}-${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Validate form
        </button>
        <button
          type="button"
          onClick={() => setValues(defaultValues)}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
