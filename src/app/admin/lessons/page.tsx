import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteLessonAction, listLessons } from "@/features/admin/lessons";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminLessonsPage() {
  await requireAdminUser();
  const { t, link } = await getServerI18n();
  const lessons = await listLessons();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.lessons.eyebrow")}
        title={t("admin.lessons.title")}
        description={t("admin.lessons.description")}
        actions={
          <Button asChild>
            <Link href={link("/admin/lessons/new")}>{t("admin.lessons.new")}</Link>
          </Button>
        }
      />

      {lessons.length === 0 ? (
        <EmptyState title={t("admin.lessons.emptyTitle")} description={t("admin.lessons.emptyDescription")} />
      ) : (
        <section className="surface-panel overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("admin.lessons.columns.lesson")}</TableHead>
                <TableHead>{t("admin.lessons.columns.hsk")}</TableHead>
                <TableHead>{t("admin.lessons.columns.order")}</TableHead>
                <TableHead>{t("admin.lessons.columns.status")}</TableHead>
                <TableHead>{t("admin.lessons.columns.updated")}</TableHead>
                <TableHead className="text-right">{t("admin.lessons.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{lesson.title}</div>
                    <div className="text-sm text-muted-foreground">{lesson.slug}</div>
                  </TableCell>
                  <TableCell>HSK {lesson.hsk_level}</TableCell>
                  <TableCell>{lesson.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={lesson.is_published ? "success" : "warning"}>
                      {lesson.is_published ? t("admin.status.published") : t("admin.status.draft")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(lesson.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={link(`/admin/lessons/${lesson.id}/edit`)}>{t("common.edit")}</Link>
                      </Button>
                      <form action={deleteLessonAction}>
                        <input type="hidden" name="id" value={lesson.id} />
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
