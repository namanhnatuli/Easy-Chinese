import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  listPublicWords,
  listVocabularyFilterOptions,
  parseVocabularyFilters,
} from "@/features/public/vocabulary";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseVocabularyFilters(resolvedSearchParams);
  const [{ topics, radicals }, words] = await Promise.all([
    listVocabularyFilterOptions(),
    listPublicWords(filters),
  ]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Vocabulary"
        badge="Published content"
        title="Words designed for quick recognition and clean reading"
        description="Browse published vocabulary with clear Hanzi, pinyin, Hán Việt, and Vietnamese meaning, then jump into the learner shell when you are ready."
      />

      <FilterBar>
        <form className="grid w-full gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]" method="get">
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">HSK level</span>
            <select
              name="hsk"
              defaultValue={filters.hsk?.toString() ?? ""}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All levels</option>
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
            <span className="text-sm font-medium text-foreground">Topic</span>
            <select
              name="topic"
              defaultValue={filters.topic ?? ""}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.slug}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Radical</span>
            <select
              name="radical"
              defaultValue={filters.radical ?? ""}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All radicals</option>
              {radicals.map((radical) => (
                <option key={radical.id} value={radical.id}>
                  {radical.radical} · {radical.meaningVi}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <Button type="submit" className="h-11">
              Apply filters
            </Button>
            <Button asChild type="button" variant="ghost" className="h-11">
              <Link href="/vocabulary">Reset</Link>
            </Button>
          </div>
        </form>
      </FilterBar>

      {words.length === 0 ? (
        <EmptyState
          title="No published words match these filters"
          description="Try a different HSK level, topic, or radical filter to widen the results."
        />
      ) : (
        <section className="grid gap-4">
          {words.map((word) => (
            <Card key={word.id} className="border-border/80">
              <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">HSK {word.hskLevel}</Badge>
                    {word.topic ? <Badge variant="outline">{word.topic.name}</Badge> : null}
                    {word.radical ? (
                      <Badge variant="outline">
                        {word.radical.radical} · {word.radical.meaningVi}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-4 text-hanzi">{word.hanzi}</p>
                  <p className="mt-2 text-pinyin">{word.pinyin}</p>
                  <p className="mt-3 text-base font-medium text-foreground">{word.vietnameseMeaning}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {word.hanViet ? <span>Hán Việt: {word.hanViet}</span> : null}
                    {word.notes ? <span>{word.notes}</span> : null}
                  </div>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/vocabulary/${word.slug}`}>Open detail</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
