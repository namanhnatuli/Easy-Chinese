import Link from "next/link";

import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sampleWords } from "@/types/domain";

export default function VocabularyPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Vocabulary"
        badge="Public browsing"
        title="Words designed for quick recognition and clean reading"
        description="Chinese text, pinyin, Hán Việt, and Vietnamese meaning are separated clearly so learners can scan quickly without losing nuance."
      />

      <FilterBar>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">HSK 1</Badge>
          <Badge variant="secondary">Greetings</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Search and topic filters can slot into this bar once public browsing data is wired.
        </p>
      </FilterBar>

      <section className="grid gap-4">
        {sampleWords.map((word) => (
          <Card key={word.id} className="border-border/80">
            <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-hanzi">{word.hanzi}</p>
                <p className="mt-2 text-pinyin">{word.pinyin}</p>
                <p className="mt-3 text-base font-medium text-foreground">{word.vietnameseMeaning}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {word.hanViet ? <span>Hán Việt: {word.hanViet}</span> : null}
                  <span>HSK {word.hskLevel}</span>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href={`/vocabulary/${word.slug}`}>Open detail</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
