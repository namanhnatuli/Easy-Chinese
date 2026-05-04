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
import { getPublicLessonBySlug } from "@/features/public/lessons.server";
import { getServerI18n } from "@/i18n/server";

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
  const { t, link } = await getServerI18n();

  if (!lesson) {
    notFound();
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("lessons.lessonOverview")}
        badge={`HSK ${lesson.hskLevel}`}
        title={lesson.title}
        description={lesson.description}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="lg">
              <Link href={link("/practice/reading")}>{t("practice.cta.reading")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={link("/practice/writing")}>{t("practice.cta.writing")}</Link>
            </Button>
            <Button asChild size="lg">
              <Link href={link(`/learn/lesson/${lesson.id}`)}>
                {t("common.startLesson")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <FilterBar>
        <div className="flex flex-wrap gap-2">
          {lesson.topic ? <Badge variant="secondary">{lesson.topic.name}</Badge> : null}
          <Badge variant="secondary">{t("lessons.vocabularyItems", { count: lesson.words.length })}</Badge>
          <Badge variant="secondary">{t("lessons.grammarPoints", { count: lesson.grammarPoints.length })}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("lessons.reviewContentFirst")}
        </p>
      </FilterBar>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("lessons.vocabularyFocus")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lesson.words.length === 0 ? (
              <EmptyState
                title={t("lessons.noLessonWords")}
                description={t("lessons.noLessonWordsDescription")}
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
            <CardTitle>{t("lessons.grammarFocus")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lesson.grammarPoints.length === 0 ? (
              <EmptyState
                title={t("lessons.noLessonGrammar")}
                description={t("lessons.noLessonGrammarDescription")}
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
