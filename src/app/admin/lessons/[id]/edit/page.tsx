import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LessonForm } from "@/components/admin/lesson-form";
import { getLessonEditor, listLessonFormOptions, saveLessonAction } from "@/features/admin/lessons";
import { requireAdminUser } from "@/lib/auth";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();
  const { id } = await params;
  const [initialValue, options] = await Promise.all([getLessonEditor(id), listLessonFormOptions()]);

  if (!initialValue) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Lessons"
        title={`Edit ${initialValue.lesson.title}`}
        description="Update lesson metadata, publish state, and ordered composition."
      />
      <LessonForm
        action={saveLessonAction}
        initialValue={initialValue}
        topics={options.topics}
        words={options.words}
        grammarPoints={options.grammarPoints}
        submitLabel="Save lesson"
      />
    </div>
  );
}
