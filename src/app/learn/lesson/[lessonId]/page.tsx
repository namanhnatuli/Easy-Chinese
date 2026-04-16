import { notFound } from "next/navigation";

import { sampleLessons } from "@/types/domain";

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = sampleLessons.find((entry) => entry.id === lessonId);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Learning Session
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{lesson.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          The focused dark learning panels belong to phase 6. In phase 1 this route exists only as
          part of the planned route structure.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Flashcard mode</h2>
          <p className="mt-2 text-sm text-slate-600">Planned for phase 6.</p>
        </article>
        <article className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Multiple choice mode</h2>
          <p className="mt-2 text-sm text-slate-600">Planned for phase 6.</p>
        </article>
        <article className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Typing mode</h2>
          <p className="mt-2 text-sm text-slate-600">Planned for phase 6.</p>
        </article>
      </section>
    </div>
  );
}
