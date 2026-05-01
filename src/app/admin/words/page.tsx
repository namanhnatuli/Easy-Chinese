import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminPageSizeSelect } from "@/components/admin/admin-page-size-select";
import { AdminWordsFilterBar } from "@/components/admin/admin-words-filter-bar";
import { WordDeleteDialogButton } from "@/components/admin/word-delete-dialog-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listWordsPage } from "@/features/admin/words";
import { requireAdminSupabase } from "@/features/admin/shared";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function parsePositiveInteger(value: string | string[] | undefined, fallback: number) {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function buildAdminWordsPath(params: {
  page?: number;
  pageSize?: number;
  q?: string | null;
  hsk?: string | null;
  topic?: string | null;
  searchParams?: URLSearchParams;
}) {
  const searchParams = params.searchParams ? new URLSearchParams(params.searchParams) : new URLSearchParams();

  if (params.page !== undefined) {
    if (params.page > 1) {
      searchParams.set("page", String(params.page));
    } else {
      searchParams.delete("page");
    }
  }

  if (params.pageSize !== undefined) {
    if (params.pageSize !== 10) {
      searchParams.set("pageSize", String(params.pageSize));
    } else {
      searchParams.delete("pageSize");
    }
  }

  if (params.q !== undefined) {
    if (params.q) searchParams.set("q", params.q);
    else searchParams.delete("q");
  }

  if (params.hsk !== undefined) {
    if (params.hsk && params.hsk !== "all") searchParams.set("hsk", params.hsk);
    else searchParams.delete("hsk");
  }

  if (params.topic !== undefined) {
    if (params.topic && params.topic !== "all") searchParams.set("topic", params.topic);
    else searchParams.delete("topic");
  }

  const query = searchParams.toString();
  return query ? `/admin/words?${query}` : "/admin/words";
}

export default async function AdminWordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const { t, link } = await getServerI18n();
  const searchParamsValue = await searchParams;
  const { supabase } = await requireAdminSupabase();
  const q = typeof searchParamsValue.q === "string" ? searchParamsValue.q : undefined;
  const hsk = typeof searchParamsValue.hsk === "string" ? parseInt(searchParamsValue.hsk, 10) : undefined;
  const topic =
    typeof searchParamsValue.topic === "string"
      ? searchParamsValue.topic
      : typeof searchParamsValue.tag === "string"
        ? searchParamsValue.tag
        : undefined;

  const requestedPageSize = parsePositiveInteger(searchParamsValue.pageSize, 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : 10;
  const requestedPage = parsePositiveInteger(searchParamsValue.page, 1);
  const wordsPage = await listWordsPage({
    page: requestedPage,
    pageSize,
    q,
    hsk: isNaN(hsk as number) ? undefined : hsk,
    topic,
  });
  const words = wordsPage.items;
  
  const { data: topics } = await supabase.from("topics").select("slug, name").order("name");
  const availableTopics = (topics ?? []).map((item) => ({
    slug: item.slug,
    label: item.name,
  }));
  const start = wordsPage.totalItems === 0 ? 0 : (wordsPage.page - 1) * wordsPage.pageSize + 1;
  const end = wordsPage.totalItems === 0
    ? 0
    : Math.min(wordsPage.page * wordsPage.pageSize, wordsPage.totalItems);

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

      <AdminWordsFilterBar 
        availableTags={availableTopics}
        searchPlaceholder={t("filters.searchPlaceholder") || "Search words..."}
        hskPlaceholder={t("filters.allLevels")}
        tagsPlaceholder={t("filters.allTopics")}
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
                <TableHead>{t("admin.words.columns.lessons")}</TableHead>
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
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{word.lessonCount}</div>
                      {word.lessonLinks.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {word.lessonLinks.slice(0, 3).map((lesson) => (
                            <Link
                              key={`${word.id}-${lesson.lessonId}`}
                              href={link(`/admin/lessons/${lesson.lessonId}/edit`)}
                              className="text-xs text-primary underline-offset-4 hover:underline"
                            >
                              {lesson.lessonTitle}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("admin.words.noLessons")}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={word.is_published ? "success" : "warning"}>
                      {word.is_published ? t("admin.status.published") : t("admin.status.draft")}
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
                      <WordDeleteDialogButton wordId={word.id} hanzi={word.hanzi} slug={word.slug} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {t("common.paginationSummary", {
                start,
                end,
                total: wordsPage.totalItems,
                itemLabel: t("navigation.words.label").toLowerCase(),
              })}
            </div>
            <div className="flex items-center gap-2">
              <AdminPageSizeSelect value={wordsPage.pageSize} options={PAGE_SIZE_OPTIONS} />
              <Button asChild type="button" variant="outline" size="sm" disabled={wordsPage.page <= 1}>
                <Link
                  href={link(buildAdminWordsPath({ page: wordsPage.page - 1, searchParams: new URLSearchParams(searchParamsValue as Record<string, string>) }))}
                  aria-disabled={wordsPage.page <= 1}
                  tabIndex={wordsPage.page <= 1 ? -1 : undefined}
                >
                  {t("common.previous")}
                </Link>
              </Button>
              <div className="min-w-16 text-center text-sm text-muted-foreground">
                {wordsPage.page} / {wordsPage.pageCount}
              </div>
              <Button
                asChild
                type="button"
                variant="outline"
                size="sm"
                disabled={wordsPage.page >= wordsPage.pageCount}
              >
                <Link
                  href={link(buildAdminWordsPath({ page: wordsPage.page + 1, searchParams: new URLSearchParams(searchParamsValue as Record<string, string>) }))}
                  aria-disabled={wordsPage.page >= wordsPage.pageCount}
                  tabIndex={wordsPage.page >= wordsPage.pageCount ? -1 : undefined}
                >
                  {t("common.next")}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
