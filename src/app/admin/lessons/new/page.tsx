import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LessonForm } from "@/components/admin/lesson-form";
import { listLessonFormOptions, saveLessonAction } from "@/features/admin/lessons";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function NewLessonPage() {
  await requireAdminUser();
  const { t } = await getServerI18n();
  const options = await listLessonFormOptions();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.lessons.eyebrow")}
        title={t("admin.lessons.create.title")}
        description={t("admin.lessons.create.description")}
      />
      <LessonForm
        action={saveLessonAction}
        topics={options.topics}
        words={options.words}
        grammarPoints={options.grammarPoints}
        submitLabel={t("admin.lessons.create.submit")}
      />
    </div>
  );
}
