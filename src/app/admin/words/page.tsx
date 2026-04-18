import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteWordAction, listWords } from "@/features/admin/words";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminWordsPage() {
  await requireAdminUser();
  const { t, link } = await getServerI18n();
  const words = await listWords();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.words.eyebrow")}
        title={t("admin.words.title")}
        description={t("admin.words.description")}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={link("/admin/import")}>{t("navigation.import.label")}</Link>
            </Button>
            <Button asChild>
              <Link href={link("/admin/words/new")}>{t("admin.words.new")}</Link>
            </Button>
          </div>
        }
      />

      {words.length === 0 ? (
        <EmptyState title={t("admin.words.emptyTitle")} description={t("admin.words.emptyDescription")} />
      ) : (
        <section className="surface-panel overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("admin.words.columns.word")}</TableHead>
                <TableHead>{t("admin.words.columns.meaning")}</TableHead>
                <TableHead>{t("admin.words.columns.hsk")}</TableHead>
                <TableHead>{t("admin.words.columns.status")}</TableHead>
                <TableHead>{t("admin.words.columns.updated")}</TableHead>
                <TableHead className="text-right">{t("admin.words.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {words.map((word) => (
                <TableRow key={word.id}>
                  <TableCell>
                    <div className="font-chinese text-2xl font-semibold text-foreground">{word.hanzi}</div>
                    <div className="text-sm text-muted-foreground">
                      {word.pinyin} · {word.slug}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{word.vietnamese_meaning}</TableCell>
                  <TableCell>HSK {word.hsk_level}</TableCell>
                  <TableCell>
                    <Badge variant={word.is_published ? "success" : "warning"}>
                      {word.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                      {new Date(word.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={link(`/admin/words/${word.id}/edit`)}>{t("common.edit")}</Link>
                      </Button>
                      <form action={deleteWordAction}>
                        <input type="hidden" name="id" value={word.id} />
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
