import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GrammarPointForm } from "@/components/admin/grammar-point-form";
import { getGrammarEditor, saveGrammarAction } from "@/features/admin/grammar";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function EditGrammarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();
  const { t } = await getServerI18n();
  const { id } = await params;
  const initialValue = await getGrammarEditor(id);

  if (!initialValue) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.grammar.edit.eyebrow")}
        title={`Edit ${initialValue.grammarPoint.title}`}
        description={t("admin.grammar.edit.description")}
      />
      <GrammarPointForm
        action={saveGrammarAction}
        initialValue={initialValue}
        submitLabel={t("admin.grammar.edit.submit")}
      />
    </div>
  );
}
