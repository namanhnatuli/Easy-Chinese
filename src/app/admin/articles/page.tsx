import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteLearningArticleAction, listAdminArticles } from "@/features/admin/articles";
import { getLearningArticleTypeLabel } from "@/features/articles/constants";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminArticlesPage() {
  await requireAdminUser();
  const { t, link } = await getServerI18n();
  const articles = await listAdminArticles();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.articles.eyebrow")}
        title={t("admin.articles.title")}
        description={t("admin.articles.description")}
        actions={
          <Button asChild>
            <Link href={link("/admin/articles/new")}>{t("admin.articles.new")}</Link>
          </Button>
        }
      />

      {articles.length === 0 ? (
        <EmptyState title={t("admin.articles.emptyTitle")} description={t("admin.articles.emptyDescription")} />
      ) : (
        <section className="surface-panel overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("admin.articles.columns.title")}</TableHead>
                <TableHead>{t("admin.articles.columns.type")}</TableHead>
                <TableHead>{t("admin.articles.columns.hsk")}</TableHead>
                <TableHead>{t("admin.articles.columns.status")}</TableHead>
                <TableHead>{t("admin.articles.columns.updated")}</TableHead>
                <TableHead className="text-right">{t("admin.articles.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{article.title}</div>
                    <div className="text-sm text-muted-foreground">{article.slug}</div>
                  </TableCell>
                  <TableCell>{getLearningArticleTypeLabel(article.article_type)}</TableCell>
                  <TableCell>{article.hsk_level ? `HSK ${article.hsk_level}` : t("common.notAvailable")}</TableCell>
                  <TableCell>
                    <Badge variant={article.is_published ? "success" : "warning"}>
                      {article.is_published ? t("admin.status.published") : t("admin.status.draft")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(article.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={link(`/admin/articles/${article.id}/edit`)}>{t("common.edit")}</Link>
                      </Button>
                      <form action={deleteLearningArticleAction}>
                        <input type="hidden" name="id" value={article.id} />
                        <Button type="submit" variant="ghost" size="sm" className="text-rose-600 hover:text-rose-600">
                          {t("common.delete")}
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
