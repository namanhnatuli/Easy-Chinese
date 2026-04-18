import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteGrammarAction, listGrammarPoints } from "@/features/admin/grammar";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminGrammarPage() {
  await requireAdminUser();
  const { t, link } = await getServerI18n();
  const grammarPoints = await listGrammarPoints();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.grammar.eyebrow")}
        title={t("admin.grammar.title")}
        description={t("admin.grammar.description")}
        actions={
          <Button asChild>
            <Link href={link("/admin/grammar/new")}>{t("admin.grammar.new")}</Link>
          </Button>
        }
      />

      {grammarPoints.length === 0 ? (
        <EmptyState title={t("admin.grammar.emptyTitle")} description={t("admin.grammar.emptyDescription")} />
      ) : (
        <section className="surface-panel overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("admin.grammar.columns.title")}</TableHead>
                <TableHead>{t("admin.grammar.columns.slug")}</TableHead>
                <TableHead>{t("admin.grammar.columns.hsk")}</TableHead>
                <TableHead>{t("admin.grammar.columns.status")}</TableHead>
                <TableHead>{t("admin.grammar.columns.updated")}</TableHead>
                <TableHead className="text-right">{t("admin.grammar.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grammarPoints.map((point) => (
                <TableRow key={point.id}>
                  <TableCell className="font-semibold text-foreground">{point.title}</TableCell>
                  <TableCell className="text-muted-foreground">{point.slug}</TableCell>
                  <TableCell>HSK {point.hsk_level}</TableCell>
                  <TableCell>
                    <Badge variant={point.is_published ? "success" : "warning"}>
                      {point.is_published ? t("admin.status.published") : t("admin.status.draft")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(point.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={link(`/admin/grammar/${point.id}/edit`)}>{t("common.edit")}</Link>
                      </Button>
                      <form action={deleteGrammarAction}>
                        <input type="hidden" name="id" value={point.id} />
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
