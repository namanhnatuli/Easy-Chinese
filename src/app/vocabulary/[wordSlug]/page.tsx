import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sampleWords } from "@/types/domain";

export default async function VocabularyDetailPage({
  params,
}: {
  params: Promise<{ wordSlug: string }>;
}) {
  const { wordSlug } = await params;
  const word = sampleWords.find((entry) => entry.slug === wordSlug);

  if (!word) notFound();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Vocabulary detail"
        badge={`HSK ${word.hskLevel}`}
        title={word.hanzi}
        description={word.notes ?? word.vietnameseMeaning}
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <p className="text-pinyin">{word.pinyin}</p>
            <p className="mt-3 text-2xl font-semibold text-foreground">{word.vietnameseMeaning}</p>
            {word.hanViet ? <p className="mt-2 text-sm text-muted-foreground">Hán Việt: {word.hanViet}</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">Slug: {word.slug}</Badge>
            <Badge variant="secondary">Traditional: {word.traditional ?? "—"}</Badge>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
