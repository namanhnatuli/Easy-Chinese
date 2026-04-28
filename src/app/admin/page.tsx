import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminPage() {
  await requireAdminUser();
  const { t, link } = await getServerI18n();
  const adminSections = [
    {
      href: link("/admin/words"),
      title: t("admin.overview.sections.wordsTitle"),
      description: t("admin.overview.sections.wordsDescription"),
    },
    {
      href: link("/admin/grammar"),
      title: t("admin.overview.sections.grammarTitle"),
      description: t("admin.overview.sections.grammarDescription"),
    },
    {
      href: link("/admin/lessons"),
      title: t("admin.overview.sections.lessonsTitle"),
      description: t("admin.overview.sections.lessonsDescription"),
    },
    {
      href: link("/admin/articles"),
      title: t("admin.overview.sections.articlesTitle"),
      description: t("admin.overview.sections.articlesDescription"),
    },
    {
      href: link("/admin/topics"),
      title: t("admin.overview.sections.topicsTitle"),
      description: t("admin.overview.sections.topicsDescription"),
    },
    {
      href: link("/admin/radicals"),
      title: t("admin.overview.sections.radicalsTitle"),
      description: t("admin.overview.sections.radicalsDescription"),
    },
    {
      href: link("/admin/content-sync"),
      title: t("admin.overview.sections.contentSyncTitle"),
      description: t("admin.overview.sections.contentSyncDescription"),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.overview.eyebrow")}
        title={t("admin.overview.title")}
        description={t("admin.overview.description")}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {adminSections.map((section) => (
          <Card key={section.href} className="border-border/80 transition hover:border-primary/30">
            <CardContent className="p-6">
              <Link href={section.href} className="block">
                <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
