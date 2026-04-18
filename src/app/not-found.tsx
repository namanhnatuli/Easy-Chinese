import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getServerI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t, link } = await getServerI18n();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("notFound.eyebrow")}
        badge={t("notFound.badge")}
        title={t("notFound.title")}
        description={t("notFound.description")}
      />

      <EmptyState
        title={t("notFound.emptyTitle")}
        description={t("notFound.emptyDescription")}
        visual={<Compass className="size-10 text-muted-foreground" aria-hidden="true" />}
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={link("/")}>
                <Home className="size-4" />
                {t("common.home")}
              </Link>
            </Button>
            <Button asChild>
              <Link href={link("/lessons")}>
                <Search className="size-4" />
                {t("common.browseLessons")}
              </Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
