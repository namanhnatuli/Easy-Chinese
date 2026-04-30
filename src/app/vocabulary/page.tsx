import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PronunciationButton } from "@/components/shared/pronunciation-button";
import {
  formatPublicPartOfSpeech,
  formatPublicStructureType,
  listVocabularyFilterOptions,
  listPublicWordsPage,
  parseVocabularyPage,
  parseVocabularyFilters,
} from "@/features/public/vocabulary";
import { getServerI18n } from "@/i18n/server";

const PAGE_SIZE = 12;

function buildVocabularyPath(params: {
  page?: number;
  q?: string;
  hsk?: number;
  topic?: string;
  radical?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.hsk) {
    searchParams.set("hsk", String(params.hsk));
  }

  if (params.topic) {
    searchParams.set("topic", params.topic);
  }

  if (params.radical) {
    searchParams.set("radical", params.radical);
  }

  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  const query = searchParams.toString();
  return query ? `/vocabulary?${query}` : "/vocabulary";
}

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseVocabularyFilters(resolvedSearchParams);
  const page = parseVocabularyPage(resolvedSearchParams.page);
  const [{ topics, radicals }, wordsPage] = await Promise.all([
    listVocabularyFilterOptions(),
    listPublicWordsPage(filters, { page, pageSize: PAGE_SIZE }),
  ]);
  const { t, link } = await getServerI18n();
  const words = wordsPage.items;
  const start = wordsPage.totalItems === 0 ? 0 : (wordsPage.page - 1) * wordsPage.pageSize + 1;
  const end = wordsPage.totalItems === 0
    ? 0
    : Math.min(wordsPage.page * wordsPage.pageSize, wordsPage.totalItems);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("vocabulary.eyebrow")}
        badge={t("common.publishedContent")}
        title={t("vocabulary.title")}
        description={t("vocabulary.description")}
      />

      <FilterBar>
        <form className="grid w-full gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))_auto]" method="get">
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">{t("filters.searchPlaceholder")}</span>
            <input
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder={t("vocabulary.filters.searchPlaceholder")}
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
            <span className="text-sm font-medium text-foreground">{t("filters.topic")}</span>
            <select
              name="topic"
              defaultValue={filters.topic ?? ""}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t("filters.allTopics")}</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.slug}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">{t("filters.radical")}</span>
            <select
              name="radical"
              defaultValue={filters.radical ?? ""}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t("filters.allRadicals")}</option>
              {radicals.map((radical) => (
                <option key={radical.id} value={radical.id}>
                  {radical.radical} · {radical.meaningVi}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <Button type="submit" className="h-11">
              {t("common.applyFilters")}
            </Button>
            <Button asChild type="button" variant="ghost" className="h-11">
              <Link href={link("/vocabulary")}>{t("common.reset")}</Link>
            </Button>
          </div>
        </form>
      </FilterBar>

      {words.length === 0 ? (
        <EmptyState
          title={t("vocabulary.emptyTitle")}
          description={t("vocabulary.emptyDescription")}
        />
      ) : (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/80 px-5 py-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("common.paginationSummary", {
                start,
                end,
                total: wordsPage.totalItems,
                itemLabel: t("navigation.vocabulary.label").toLowerCase(),
              })}
            </p>
            <div className="text-sm text-muted-foreground">
              {t("vocabulary.pageStatus", { page: wordsPage.page, totalPages: wordsPage.pageCount })}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
          {words.map((word) => (
            <Card key={word.id} className="border-border/80 bg-card/95">
              <CardContent className="flex h-full flex-col gap-5 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">HSK {word.hskLevel}</Badge>
                    {word.topic ? <Badge variant="outline">{word.topic.name}</Badge> : null}
                    {formatPublicStructureType(word.characterStructureType) ? (
                      <Badge variant="outline">
                        {t("vocabulary.structureBadge", {
                          value: formatPublicStructureType(word.characterStructureType)?.label ?? "",
                        })}
                      </Badge>
                    ) : null}
                    {word.ambiguityFlag ? (
                      <Badge variant="warning">{t("vocabulary.ambiguousBadge")}</Badge>
                    ) : null}
                    {word.sourceConfidence ? (
                      <Badge variant="outline">
                        {t(`vocabulary.sourceConfidence.${word.sourceConfidence}` as "vocabulary.sourceConfidence.low")}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-hanzi">
                        {word.simplified}
                        {word.traditional && word.traditional !== word.simplified ? ` [${word.traditional}]` : ""}
                      </p>
                      <PronunciationButton
                        text={word.simplified}
                        lang="zh-CN"
                        rate={0.82}
                        className="shrink-0"
                      >
                        Nghe từ
                      </PronunciationButton>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="text-pinyin">{word.pinyin}</span>
                      {word.hanViet ? <span>{t("vocabulary.hanViet", { value: word.hanViet })}</span> : null}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-base font-semibold text-foreground">{word.vietnameseMeaning}</p>
                    {word.englishMeaning ? (
                      <p className="text-sm text-muted-foreground">{word.englishMeaning}</p>
                    ) : null}
                    {word.notes ? (
                      <p className="text-sm leading-6 text-muted-foreground">{word.notes}</p>
                    ) : null}
                    {word.radicalSummary ? (
                      <p className="text-sm leading-6 text-muted-foreground">{word.radicalSummary}</p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {word.radicals.map((radical) => (
                      <Badge key={`${word.id}-${radical.id}`} variant="outline">
                        {radical.radical} · {radical.meaningVi}
                      </Badge>
                    ))}
                    {formatPublicPartOfSpeech(word.partOfSpeech).map((entry) => (
                      <Badge key={`${word.id}-${entry.value}`} variant="secondary">
                        {entry.label}
                      </Badge>
                    ))}
                    {word.topicTags.map((tag) => (
                      <Badge key={`${word.id}-${tag.slug}`} variant="secondary">
                        #{tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-auto flex justify-end">
                  <Button asChild variant="outline">
                    <Link href={link(`/vocabulary/${word.slug}`)}>{t("vocabulary.openDetail")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/80 px-5 py-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("vocabulary.pageStatus", { page: wordsPage.page, totalPages: wordsPage.pageCount })}
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" disabled={wordsPage.page <= 1}>
                <Link
                  href={link(
                    buildVocabularyPath({
                      page: wordsPage.page - 1,
                      q: filters.q,
                      hsk: filters.hsk,
                      topic: filters.topic,
                      radical: filters.radical,
                    }),
                  )}
                  aria-disabled={wordsPage.page <= 1}
                  tabIndex={wordsPage.page <= 1 ? -1 : undefined}
                >
                  {t("common.previous")}
                </Link>
              </Button>
              <div className="min-w-16 text-center text-sm text-muted-foreground">
                {wordsPage.page} / {wordsPage.pageCount}
              </div>
              <Button asChild variant="outline" size="sm" disabled={wordsPage.page >= wordsPage.pageCount}>
                <Link
                  href={link(
                    buildVocabularyPath({
                      page: wordsPage.page + 1,
                      q: filters.q,
                      hsk: filters.hsk,
                      topic: filters.topic,
                      radical: filters.radical,
                    }),
                  )}
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
