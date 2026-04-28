import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ArticleForm } from "@/components/admin/article-form";
import { listLearningArticleFormOptions, saveLearningArticleAction } from "@/features/admin/articles";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function NewArticlePage() {
  await requireAdminUser();
  const { t } = await getServerI18n();
  const options = await listLearningArticleFormOptions();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.articles.eyebrow")}
        title={t("admin.articles.create.title")}
        description={t("admin.articles.create.description")}
      />
      <ArticleForm
        action={saveLearningArticleAction}
        submitLabel={t("admin.articles.create.submit")}
        tags={options.tags}
        words={options.words}
        grammarPoints={options.grammarPoints}
      />
    </div>
  );
}
