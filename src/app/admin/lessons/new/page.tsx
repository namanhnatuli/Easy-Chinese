import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LessonForm } from "@/components/admin/lesson-form";
import { listLessonFormOptions, saveLessonAction } from "@/features/admin/lessons";
import { requireAdminUser } from "@/lib/auth";

export default async function NewLessonPage() {
  await requireAdminUser();
  const options = await listLessonFormOptions();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Lessons"
        title="New lesson"
        description="Create a lesson and attach ordered words and grammar points."
      />
      <LessonForm
        action={saveLessonAction}
        topics={options.topics}
        words={options.words}
        grammarPoints={options.grammarPoints}
        submitLabel="Create lesson"
      />
    </div>
  );
}
