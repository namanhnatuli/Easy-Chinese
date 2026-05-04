import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseGrammarFilters } from "@/features/public/grammar";
import { listPublicGrammarPoints } from "@/features/public/grammar.server";
import { getServerI18n } from "@/i18n/server";

export default async function GrammarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseGrammarFilters(resolvedSearchParams);
  const grammarPoints = await listPublicGrammarPoints(filters);
  const { t, link } = await getServerI18n();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("grammar.eyebrow")}
        badge={t("common.publishedContent")}
        title={t("grammar.title")}
        description={t("grammar.description")}
      />

      <FilterBar>
        <form className="grid w-full gap-3 sm:grid-cols-[minmax(0,16rem)_auto]" method="get">
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">{t("filters.hskLevel")}</span>
            <select
              name="hsk"
              defaultValue={filters.hsk?.toString() ?? ""}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t("filters.allLevels")}</option>
              {Array.from({ length: 9 }).map((_, index) => {
                const level = index + 1;
                return (
                  <option key={level} value={level}>
                    HSK {level}
                  </option>
                );
              })}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <Button type="submit" className="h-11">
              {t("common.applyFilters")}
            </Button>
            <Button asChild type="button" variant="ghost" className="h-11">
              <Link href={link("/grammar")}>{t("common.reset")}</Link>
            </Button>
          </div>
        </form>
      </FilterBar>

      {grammarPoints.length === 0 ? (
        <EmptyState
          title={t("grammar.emptyTitle")}
          description={t("grammar.emptyDescription")}
        />
      ) : (
        <section className="grid gap-4">
          {grammarPoints.map((point) => (
            <Card key={point.id}>
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">HSK {point.hskLevel}</Badge>
                    {point.notes ? <Badge variant="outline">{point.notes}</Badge> : null}
                  </div>
                  <p className="mt-4 text-lg font-semibold">{point.title}</p>
                  <p className="mt-2 text-sm text-primary">{point.structureText}</p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{point.explanationVi}</p>
                </div>
                <Button asChild variant="outline">
                  <Link href={link(`/grammar/${point.slug}`)}>{t("grammar.openDetail")}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
