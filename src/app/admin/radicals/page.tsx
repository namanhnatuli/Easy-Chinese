import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RadicalForm } from "@/components/admin/radical-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  deleteRadicalAction,
  getRadicalById,
  listRadicals,
  saveRadicalAction,
} from "@/features/admin/radicals";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminRadicalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string }>;
}) {
  await requireAdminUser();
  const { t, link } = await getServerI18n();
  const params = (await searchParams) ?? {};
  const [radicals, editingRadical] = await Promise.all([
    listRadicals(),
    params.edit ? getRadicalById(params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.radicals.eyebrow")}
        title={t("admin.radicals.title")}
        description={t("admin.radicals.description")}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {radicals.length === 0 ? (
          <EmptyState title={t("admin.radicals.emptyTitle")} description={t("admin.radicals.emptyDescription")} />
        ) : (
          <section className="surface-panel overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{t("admin.radicals.columns.radical")}</TableHead>
                  <TableHead>{t("admin.radicals.columns.pinyin")}</TableHead>
                  <TableHead>{t("admin.radicals.columns.meaning")}</TableHead>
                  <TableHead>{t("admin.radicals.columns.strokes")}</TableHead>
                  <TableHead className="text-right">{t("admin.radicals.columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {radicals.map((radical) => (
                  <TableRow key={radical.id}>
                    <TableCell className="font-chinese text-2xl font-semibold text-foreground">
                      {radical.radical}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{radical.pinyin ?? t("common.notAvailable")}</TableCell>
                    <TableCell className="text-muted-foreground">{radical.meaning_vi}</TableCell>
                    <TableCell>{radical.stroke_count}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={link(`/admin/radicals?edit=${radical.id}`)}>{t("common.edit")}</Link>
                        </Button>
                        <form action={deleteRadicalAction}>
                          <input type="hidden" name="id" value={radical.id} />
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

        <RadicalForm
          action={saveRadicalAction}
          initialValue={editingRadical}
          submitLabel={editingRadical ? t("admin.radicals.form.save") : t("admin.radicals.form.create")}
        />
      </div>
    </div>
  );
}
