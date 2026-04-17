import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sampleLessons } from "@/types/domain";

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ lessonSlug: string }>;
}) {
  const { lessonSlug } = await params;
  const lesson = sampleLessons.find((entry) => entry.slug === lessonSlug);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Lesson overview"
        badge={`HSK ${lesson.hskLevel}`}
        title={lesson.title}
        description={lesson.description ?? ""}
        actions={
          <Button asChild size="lg">
            <Link href={`/learn/lesson/${lesson.id}`}>
              Start lesson
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <FilterBar>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{lesson.topicName}</Badge>
          <Badge variant="secondary">{lesson.wordCount} vocabulary items</Badge>
          <Badge variant="secondary">{lesson.grammarCount} grammar points</Badge>
          <Badge variant="secondary">{lesson.estimatedMinutes} minutes</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Review the material first, then move into the focused study panel.
        </p>
      </FilterBar>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vocabulary focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lesson.words.map((word) => (
              <div key={word.id} className="rounded-[1.5rem] bg-muted/50 p-4">
                <p className="text-hanzi">{word.hanzi}</p>
                <p className="mt-2 text-pinyin">{word.pinyin}</p>
                <p className="mt-3 text-sm font-medium text-foreground">{word.vietnameseMeaning}</p>
                {word.hanViet ? <p className="mt-1 text-sm text-muted-foreground">Hán Việt: {word.hanViet}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grammar focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lesson.grammarPoints.map((point) => (
              <div key={point.id} className="rounded-[1.5rem] bg-muted/50 p-4">
                <p className="font-semibold text-foreground">{point.title}</p>
                <p className="mt-1 text-sm text-primary">{point.structureText}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{point.explanationVi}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
