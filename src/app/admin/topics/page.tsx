import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TopicForm } from "@/components/admin/topic-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteTopicAction, getTopicById, listTopics, saveTopicAction } from "@/features/admin/topics";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminTopicsPage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string }>;
}) {
  await requireAdminUser();
  const { t, link } = await getServerI18n();
  const params = (await searchParams) ?? {};
  const [topics, editingTopic] = await Promise.all([
    listTopics(),
    params.edit ? getTopicById(params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.topics.eyebrow")}
        title={t("admin.topics.title")}
        description={t("admin.topics.description")}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {topics.length === 0 ? (
          <EmptyState title={t("admin.topics.emptyTitle")} description={t("admin.topics.emptyDescription")} />
        ) : (
          <section className="surface-panel overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{t("admin.topics.columns.name")}</TableHead>
                  <TableHead>{t("admin.topics.columns.slug")}</TableHead>
                  <TableHead>{t("admin.topics.columns.description")}</TableHead>
                  <TableHead className="text-right">{t("admin.topics.columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((topic) => (
                  <TableRow key={topic.id}>
                    <TableCell className="font-semibold text-foreground">{topic.name}</TableCell>
                    <TableCell className="text-muted-foreground">{topic.slug}</TableCell>
                    <TableCell className="text-muted-foreground">{topic.description ?? t("common.notAvailable")}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={link(`/admin/topics?edit=${topic.id}`)}>{t("common.edit")}</Link>
                        </Button>
                        <form action={deleteTopicAction}>
                          <input type="hidden" name="id" value={topic.id} />
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

        <TopicForm
          action={saveTopicAction}
          initialValue={editingTopic}
          submitLabel={editingTopic ? t("admin.topics.form.save") : t("admin.topics.form.create")}
        />
      </div>
    </div>
  );
}
