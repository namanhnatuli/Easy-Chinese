import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <div className="page-shell">
      <PageHeader
        eyebrow="Learning session"
        badge="Focused study shell"
        title={lesson.title}
        description="The dark lesson workspace is prepared for the future learning engine. This pass establishes the visual shell, hierarchy, and mode-switching affordances."
      />

      <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-panel sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Lesson context
            </p>
            <h2 className="text-3xl font-semibold">Stay inside one deliberate practice flow</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Learning modes will be wired in phase 6. For now, this shell establishes the dark focus surface, mode tabs, and supporting lesson sidebar.
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
                  <p className="mt-4 text-4xl font-semibold">你好</p>
                  <p className="mt-3 text-lg text-slate-300">nǐ hǎo</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">Reveal answer</div>
                    <div className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white">Next card</div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="multiple-choice" className="mt-0">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Multiple choice mode</p>
                  <p className="mt-4 text-2xl font-semibold">Which answer matches 你好?</p>
                </div>
              </TabsContent>
              <TabsContent value="typing" className="mt-0">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Typing mode</p>
                  <p className="mt-4 text-2xl font-semibold">Type the pinyin or meaning from the prompt.</p>
                </div>
              </TabsContent>

              <aside className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Session guide</p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-[1.25rem] bg-black/20 p-4">
                    <p className="text-sm font-semibold">Modes</p>
                    <p className="mt-2 text-sm text-slate-300">Flashcard, multiple choice, and typing share one focused layout.</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-black/20 p-4">
                    <p className="text-sm font-semibold">Lesson pace</p>
                    <p className="mt-2 text-sm text-slate-300">{lesson.estimatedMinutes} minute study session.</p>
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
