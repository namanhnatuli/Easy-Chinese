import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicWordBySlug } from "@/features/public/vocabulary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ wordSlug: string }>;
}): Promise<Metadata> {
  const { wordSlug } = await params;
  const word = await getPublicWordBySlug(wordSlug);

  if (!word) {
    return {
      title: "Vocabulary not found",
    };
  }

  return {
    title: `${word.hanzi} (${word.pinyin})`,
    description: word.notes ?? word.vietnameseMeaning,
  };
}

export default async function VocabularyDetailPage({
  params,
}: {
  params: Promise<{ wordSlug: string }>;
}) {
  const { wordSlug } = await params;
  const word = await getPublicWordBySlug(wordSlug);

  if (!word) {
    notFound();
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Vocabulary detail"
        badge={`HSK ${word.hskLevel}`}
        title={word.hanzi}
        description={word.notes ?? word.vietnameseMeaning}
        actions={
          <Button asChild>
            <Link href="/vocabulary">Back to vocabulary</Link>
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4 p-6 sm:p-8">
            <p className="text-pinyin">{word.pinyin}</p>
            <p className="text-2xl font-semibold text-foreground">{word.vietnameseMeaning}</p>
            {word.hanViet ? <p className="text-sm text-muted-foreground">Hán Việt: {word.hanViet}</p> : null}
            {word.englishMeaning ? <p className="text-sm text-muted-foreground">English: {word.englishMeaning}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">Slug: {word.slug}</Badge>
            <Badge variant="secondary">Simplified: {word.simplified}</Badge>
            <Badge variant="secondary">Traditional: {word.traditional ?? "—"}</Badge>
            {word.topic ? <Badge variant="outline">{word.topic.name}</Badge> : null}
            {word.radical ? (
              <Badge variant="outline">
                {word.radical.radical} · {word.radical.meaningVi}
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {word.examples.length === 0 ? (
              <p className="text-sm text-muted-foreground">No public examples have been published for this word yet.</p>
            ) : (
              word.examples.map((example) => (
                <div key={example.id} className="rounded-[1.5rem] bg-muted/50 p-4">
                  <p className="text-lg font-semibold text-foreground">{example.chineseText}</p>
                  {example.pinyin ? <p className="mt-2 text-pinyin">{example.pinyin}</p> : null}
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{example.vietnameseMeaning}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
