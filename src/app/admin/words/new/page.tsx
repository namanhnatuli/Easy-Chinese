import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WordForm } from "@/components/admin/word-form";
import { listWordFormOptions, saveWordAction } from "@/features/admin/words";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function NewWordPage() {
  await requireAdminUser();
  const { t } = await getServerI18n();
  const { topics, radicals } = await listWordFormOptions();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.words.eyebrow")}
        title={t("admin.words.create.title")}
        description={t("admin.words.create.description")}
      />
      <WordForm
        action={saveWordAction}
        topics={topics}
        radicals={radicals}
        submitLabel={t("admin.words.create.submit")}
      />
    </div>
  );
}
