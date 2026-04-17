import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicLessonBySlug } from "@/features/public/lessons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonSlug: string }>;
}): Promise<Metadata> {
  const { lessonSlug } = await params;
  const lesson = await getPublicLessonBySlug(lessonSlug);

  if (!lesson) {
    return {
      title: "Lesson not found",
    };
  }

  return {
    title: `${lesson.title} · HSK ${lesson.hskLevel}`,
    description: lesson.description,
  };
}

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ lessonSlug: string }>;
}) {
  const { lessonSlug } = await params;
  const lesson = await getPublicLessonBySlug(lessonSlug);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Lesson overview"
        badge={`HSK ${lesson.hskLevel}`}
        title={lesson.title}
        description={lesson.description}
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
          {lesson.topic ? <Badge variant="secondary">{lesson.topic.name}</Badge> : null}
          <Badge variant="secondary">{lesson.words.length} vocabulary items</Badge>
          <Badge variant="secondary">{lesson.grammarPoints.length} grammar points</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Review the lesson content here first, then move into the learner shell when ready.
        </p>
      </FilterBar>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vocabulary focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lesson.words.length === 0 ? (
              <EmptyState
                title="No published lesson words"
                description="This lesson is published, but its public vocabulary composition is still empty."
              />
            ) : (
              lesson.words.map((word) => (
                <div key={word.id} className="rounded-[1.5rem] bg-muted/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-hanzi">{word.hanzi}</p>
                    <Badge variant="outline">#{word.sortOrder}</Badge>
                  </div>
                  <p className="mt-2 text-pinyin">{word.pinyin}</p>
                  <p className="mt-3 text-sm font-medium text-foreground">{word.vietnameseMeaning}</p>
                  {word.hanViet ? <p className="mt-1 text-sm text-muted-foreground">Hán Việt: {word.hanViet}</p> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grammar focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lesson.grammarPoints.length === 0 ? (
              <EmptyState
                title="No published lesson grammar"
                description="This lesson is published, but its public grammar composition is still empty."
              />
            ) : (
              lesson.grammarPoints.map((point) => (
                <div key={point.id} className="rounded-[1.5rem] bg-muted/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{point.title}</p>
                    <Badge variant="outline">#{point.sortOrder}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-primary">{point.structureText}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{point.explanationVi}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
