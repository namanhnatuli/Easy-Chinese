import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ArticleForm } from "@/components/admin/article-form";
import {
  getLearningArticleEditor,
  listLearningArticleFormOptions,
  saveLearningArticleAction,
} from "@/features/admin/articles";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();
  const { t } = await getServerI18n();
  const { id } = await params;
  const [initialValue, options] = await Promise.all([
    getLearningArticleEditor(id),
    listLearningArticleFormOptions(),
  ]);

  if (!initialValue) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.articles.edit.eyebrow")}
        title={initialValue.article.title}
        description={t("admin.articles.edit.description")}
      />
      <ArticleForm
        action={saveLearningArticleAction}
        initialValue={initialValue}
        submitLabel={t("admin.articles.edit.submit")}
        tags={options.tags}
        words={options.words}
        grammarPoints={options.grammarPoints}
      />
    </div>
  );
}
