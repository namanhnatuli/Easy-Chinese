import Link from "next/link";
import { notFound } from "next/navigation";

import { sampleLessons } from "@/types/domain";

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ lessonSlug: string }>;
}) {
  const { lessonSlug } = await params;
  const lesson = sampleLessons.find((entry) => entry.slug === lessonSlug);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Lesson Overview
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{lesson.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{lesson.description}</p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
          <span>HSK {lesson.hskLevel}</span>
          <span>{lesson.wordCount} vocabulary items</span>
          <span>{lesson.grammarCount} grammar point</span>
          <span>{lesson.estimatedMinutes} minutes</span>
        </div>
        <Link
          href={`/learn/lesson/${lesson.id}`}
          className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Start lesson
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Vocabulary focus</h2>
          <div className="mt-4 space-y-3">
            {lesson.words.map((word) => (
              <div key={word.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xl font-semibold text-slate-950">{word.hanzi}</p>
                <p className="mt-1 text-sm text-slate-600">{word.pinyin}</p>
                <p className="mt-2 text-sm text-slate-700">{word.vietnameseMeaning}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Grammar focus</h2>
          <div className="mt-4 space-y-3">
            {lesson.grammarPoints.map((point) => (
              <div key={point.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">{point.title}</p>
                <p className="mt-1 text-sm text-slate-600">{point.structureText}</p>
                <p className="mt-2 text-sm text-slate-700">{point.explanationVi}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
