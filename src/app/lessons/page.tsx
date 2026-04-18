import Link from "next/link";
import { BookOpen } from "lucide-react";

import { ContentCard } from "@/components/shared/content-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listLessonTopics, listPublicLessons, parseLessonFilters } from "@/features/public/lessons";
import { getServerI18n } from "@/i18n/server";

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseLessonFilters(resolvedSearchParams);
  const [topics, lessons] = await Promise.all([listLessonTopics(), listPublicLessons(filters)]);
  const { t, link } = await getServerI18n();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("lessons.eyebrow")}
        badge={t("common.publishedContent")}
        title={t("lessons.title")}
        description={t("lessons.description")}
        actions={
          <Button asChild>
            <Link href={link("/vocabulary")}>{t("common.browseVocabulary")}</Link>
          </Button>
        }
      />

      <FilterBar>
        <form className="grid w-full gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]" method="get">
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

          <div className="flex items-end gap-2">
            <Button type="submit" className="h-11">
              {t("common.applyFilters")}
            </Button>
            <Button asChild type="button" variant="ghost" className="h-11">
              <Link href={link("/lessons")}>{t("common.reset")}</Link>
            </Button>
          </div>
        </form>
      </FilterBar>

      {lessons.length === 0 ? (
        <EmptyState
          title={t("lessons.emptyTitle")}
          description={t("lessons.emptyDescription")}
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="flex flex-col gap-4">
              <ContentCard
                title={lesson.title}
                description={lesson.description}
                badge={lesson.topic?.name ?? t("common.general")}
                meta={[
                  `HSK ${lesson.hskLevel}`,
                  t("common.wordCount", { count: lesson.wordCount }),
                  t("common.grammarCount", { count: lesson.grammarCount }),
                ]}
                href={link(`/lessons/${lesson.slug}`)}
                ctaLabel={t("lessons.lessonDetails")}
              />
              <div className="flex items-center gap-2 px-2">
                <Button asChild variant="ghost" className="h-10 px-2">
                  <Link href={link(`/learn/lesson/${lesson.id}`)}>
                    <BookOpen className="size-4" />
                    {t("common.startLearning")}
                  </Link>
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">HSK {lesson.hskLevel}</Badge>
                  {lesson.topic ? <Badge variant="outline">{lesson.topic.name}</Badge> : null}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
