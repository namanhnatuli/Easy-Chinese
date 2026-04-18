import { notFound } from "next/navigation";

import { LessonStudyExperience } from "@/components/learning/lesson-study-experience";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getPublicLessonById } from "@/features/public/lessons";
import { getCurrentUser } from "@/lib/auth";

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const [lesson, user] = await Promise.all([
    getPublicLessonById(lessonId),
    getCurrentUser(),
  ]);

  if (!lesson) {
    notFound();
  }

  const signInHref = `/auth/sign-in?next=${encodeURIComponent(`/learn/lesson/${lesson.id}`)}`;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Learning session"
        badge="Phase 6 learner engine"
        title={lesson.title}
        description="Study lesson vocabulary with flashcards, multiple choice, and typing. Signed-in learners save progress, while anonymous learners can practice without persistence."
      />

      {lesson.words.length === 0 ? (
        <section className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-panel sm:p-6 lg:p-8">
          <EmptyState
            title="This lesson is not ready for study"
            description="Attach published words to the lesson before starting a learner session."
          />
        </section>
      ) : (
        <LessonStudyExperience
          lesson={{
            id: lesson.id,
            slug: lesson.slug,
            title: lesson.title,
          }}
          words={lesson.words}
          isAuthenticated={Boolean(user)}
          signInHref={signInHref}
        />
      )}
    </div>
  );
}
