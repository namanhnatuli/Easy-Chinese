import { notFound } from "next/navigation";

import { LessonStudyExperience } from "@/components/learning/lesson-study-experience";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getUserLearningSchedulerSettings } from "@/features/memory/queries";
import { getPublicLessonById } from "@/features/public/lessons";
import { getServerI18n } from "@/i18n/server";
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
  const schedulerSettings = user ? await getUserLearningSchedulerSettings(user.id) : null;
  const { t, link } = await getServerI18n();

  if (!lesson) {
    notFound();
  }

  const signInHref = `${link("/auth/sign-in")}?next=${encodeURIComponent(link(`/learn/lesson/${lesson.id}`))}`;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("learn.eyebrow")}
        badge={t("learn.badge")}
        title={lesson.title}
        description={t("learn.description")}
      />

      {lesson.words.length === 0 ? (
        <section className="rounded-[2rem] border border-border bg-card p-5 text-card-foreground shadow-panel sm:p-6 lg:p-8">
          <EmptyState
            title={t("learn.notReadyTitle")}
            description={t("learn.notReadyDescription")}
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
          schedulerSettings={schedulerSettings}
        />
      )}
    </div>
  );
}
