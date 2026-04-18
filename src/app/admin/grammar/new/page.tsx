import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GrammarPointForm } from "@/components/admin/grammar-point-form";
import { saveGrammarAction } from "@/features/admin/grammar";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function NewGrammarPage() {
  await requireAdminUser();
  const { t } = await getServerI18n();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.grammar.eyebrow")}
        title={t("admin.grammar.create.title")}
        description={t("admin.grammar.create.description")}
      />
      <GrammarPointForm action={saveGrammarAction} submitLabel={t("admin.grammar.create.submit")} />
    </div>
  );
}
