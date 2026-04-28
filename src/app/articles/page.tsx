import Link from "next/link";

import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LEARNING_ARTICLE_TYPE_OPTIONS } from "@/features/articles/constants";
import {
  listPublicArticleFilterOptions,
  listPublicArticles,
  parseArticleFilters,
} from "@/features/public/articles";
import { getServerI18n } from "@/i18n/server";

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseArticleFilters(resolvedSearchParams);
  const [articles, filterOptions, { t, link }] = await Promise.all([
    listPublicArticles(filters),
    listPublicArticleFilterOptions(),
    getServerI18n(),
  ]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("articles.eyebrow")}
        badge={t("common.publishedContent")}
        title={t("articles.title")}
        description={t("articles.description")}
      />

      <FilterBar>
        <form className="grid w-full gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.8fr))_auto]" method="get">
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">{t("articles.filters.search")}</span>
            <input
              type="search"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder={t("articles.filters.searchPlaceholder")}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
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
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">{t("articles.filters.type")}</span>
            <select
              name="type"
              defaultValue={filters.type ?? ""}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t("articles.filters.allTypes")}</option>
              {LEARNING_ARTICLE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">{t("articles.filters.tag")}</span>
            <select
              name="tag"
              defaultValue={filters.tag ?? ""}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t("articles.filters.allTags")}</option>
              {filterOptions.tags.map((tag) => (
                <option key={tag.id} value={tag.slug}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" className="h-11">
              {t("common.applyFilters")}
            </Button>
            <Button asChild type="button" variant="ghost" className="h-11">
              <Link href={link("/articles")}>{t("common.reset")}</Link>
            </Button>
          </div>
        </form>
      </FilterBar>

      {articles.length === 0 ? (
        <EmptyState
          title={t("articles.emptyTitle")}
          description={t("articles.emptyDescription")}
        />
      ) : (
        <section className="grid gap-4">
          {articles.map((article) => (
            <Card key={article.id}>
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    {article.hskLevel ? <Badge variant="secondary">HSK {article.hskLevel}</Badge> : null}
                    <Badge variant="outline">{article.articleTypeLabel}</Badge>
                    {article.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-4 text-lg font-semibold text-foreground">{article.title}</p>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{article.summary}</p>
                </div>
                <Button asChild variant="outline">
                  <Link href={link(`/articles/${article.slug}`)}>{t("articles.openDetail")}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
