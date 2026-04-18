import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { WordForm } from "@/components/admin/word-form";
import { getWordEditor, listWordFormOptions, saveWordAction } from "@/features/admin/words";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function EditWordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();
  const { t } = await getServerI18n();
  const { id } = await params;
  const [initialValue, options] = await Promise.all([getWordEditor(id), listWordFormOptions()]);

  if (!initialValue) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.words.edit.eyebrow")}
        title={`Edit ${initialValue.word.hanzi}`}
        description={t("admin.words.edit.description")}
      />
      <WordForm
        action={saveWordAction}
        topics={options.topics}
        radicals={options.radicals}
        initialValue={initialValue}
        submitLabel={t("admin.words.edit.submit")}
      />
    </div>
  );
}
