import Link from "next/link";

import { sampleLessons } from "@/types/domain";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-5">
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Structured Chinese study
            </span>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950">
              Learn words, grammar, and review patterns in one quiet study flow.
            </h1>
            <p className="max-w-2xl text-base text-slate-600">
              Start anonymously, move into saved progress when you are ready, and keep the
              learning panel focused on one task at a time.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/lessons"
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Explore lessons
              </Link>
              <Link
                href="/auth/sign-in"
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Sign in for saved progress
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-sm text-slate-300">Modes</p>
              <p className="mt-2 text-2xl font-semibold">Flashcard, multiple choice, typing</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Future-ready</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                Progress model designed for spaced repetition
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Featured lessons
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Start with the essentials</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {sampleLessons.map((lesson) => (
            <article key={lesson.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  HSK {lesson.hskLevel}
                </span>
                <span className="text-sm text-slate-500">{lesson.estimatedMinutes} min</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-950">{lesson.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{lesson.description}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>{lesson.wordCount} words</span>
                <span>{lesson.grammarCount} grammar point</span>
              </div>
              <Link
                href={`/lessons/${lesson.slug}`}
                className="mt-5 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Open lesson
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
