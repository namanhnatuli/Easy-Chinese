import Link from "next/link";

import { sampleLessons } from "@/types/domain";

export default function LessonsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Lessons</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Follow a structured path</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Public lessons stay accessible to anonymous learners. Saved lesson progress becomes
          available after sign-in.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {sampleLessons.map((lesson) => (
          <article key={lesson.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {lesson.topicName}
              </span>
              <span className="text-sm text-slate-500">{lesson.estimatedMinutes} min</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-950">{lesson.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{lesson.description}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
              <span>HSK {lesson.hskLevel}</span>
              <span>{lesson.wordCount} words</span>
              <span>{lesson.grammarCount} grammar point</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/lessons/${lesson.slug}`}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Lesson details
              </Link>
              <Link
                href={`/learn/lesson/${lesson.id}`}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Start learning
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
