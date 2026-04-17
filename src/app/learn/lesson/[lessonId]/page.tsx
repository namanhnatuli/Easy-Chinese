import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPublicLessonById } from "@/features/public/lessons";

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getPublicLessonById(lessonId);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Learning session"
        badge="Focused study shell"
        title={lesson.title}
        description="The dark lesson workspace is prepared for the future study engine. This phase only establishes the learner entry shell and mode framing."
      />

      <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-panel sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Lesson context
            </p>
            <h2 className="text-3xl font-semibold">Stay inside one deliberate practice flow</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Study interactions arrive in Phase 6. For now this learner shell is connected to real
              published lessons, with mode tabs and lesson context ready for the future engine.
            </p>
          </div>

          <Tabs defaultValue="flashcard" className="flex flex-col gap-6">
            <TabsList className="w-fit bg-white/10 text-slate-300">
              <TabsTrigger value="flashcard" className="data-[state=active]:bg-white data-[state=active]:text-slate-950">
                Flashcard
              </TabsTrigger>
              <TabsTrigger value="multiple-choice" className="data-[state=active]:bg-white data-[state=active]:text-slate-950">
                Multiple choice
              </TabsTrigger>
              <TabsTrigger value="typing" className="data-[state=active]:bg-white data-[state=active]:text-slate-950">
                Typing
              </TabsTrigger>
            </TabsList>

            <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
              <TabsContent value="flashcard" className="mt-0">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Flashcard mode</p>
                  <p className="mt-4 text-3xl font-semibold">
                    {lesson.words[0]?.hanzi ?? lesson.grammarPoints[0]?.title ?? lesson.title}
                  </p>
                  <p className="mt-3 text-lg text-slate-300">
                    {lesson.words[0]?.pinyin ?? lesson.grammarPoints[0]?.structureText ?? "Lesson preview"}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Reveal answer</div>
                    <div className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white">Next card</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="multiple-choice" className="mt-0">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Multiple choice mode</p>
                  <p className="mt-4 text-2xl font-semibold">Choose the correct answer from lesson content.</p>
                </div>
              </TabsContent>

              <TabsContent value="typing" className="mt-0">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Typing mode</p>
                  <p className="mt-4 text-2xl font-semibold">Type pinyin, Hanzi, or meaning from the lesson prompt.</p>
                </div>
              </TabsContent>

              <aside className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Session guide</p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-[1.25rem] bg-black/20 p-4">
                    <p className="text-sm font-semibold">Modes</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Flashcard, multiple choice, and typing will share one focused layout.
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-black/20 p-4">
                    <p className="text-sm font-semibold">Lesson scope</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {lesson.words.length} words and {lesson.grammarPoints.length} grammar points are attached to this lesson.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
