import Link from "next/link";

import { ReviewStudyExperience } from "@/components/learning/review-study-experience";
import { HeaderActions, HeaderLinkButton, PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearningSchedulerSettings } from "@/features/memory/spaced-repetition";
import type { DueReviewItem, SuggestedLessonItem } from "@/features/progress/types";
import { getServerI18n } from "@/i18n/server";

export async function ReviewPageContent({
  dueItems,
  suggestedLessons,
  continueLesson,
  schedulerSettings,
}: {
  dueItems: DueReviewItem[];
  suggestedLessons: SuggestedLessonItem[];
  continueLesson: SuggestedLessonItem | null;
  schedulerSettings?: Partial<LearningSchedulerSettings> | null;
}) {
  const { t, link } = await getServerI18n();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("practice.review.eyebrow")}
        badge={t("common.authenticated")}
        title={t("practice.review.title")}
        description={t("practice.review.description")}
        actions={
          <HeaderActions
            secondary={
              <HeaderLinkButton href={link("/dashboard")} variant="outline">
                {t("common.dashboard")}
              </HeaderLinkButton>
            }
            primary={
              <>
                {continueLesson ? (
                  <HeaderLinkButton href={link(`/learn/lesson/${continueLesson.id}`)} variant="outline">
                    {t("common.continueLearning")}
                  </HeaderLinkButton>
                ) : null}
                <HeaderLinkButton href={link("/practice")}>{t("common.practice")}</HeaderLinkButton>
              </>
            }
          />
        }
      />

      {dueItems.length === 0 ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <EmptyState
            title={t("practice.review.emptyTitle")}
            description={t("practice.review.emptyDescription")}
            action={
              <div className="flex flex-wrap gap-3">
                {continueLesson ? (
                  <Button asChild variant="outline">
                    <Link href={link(`/learn/lesson/${continueLesson.id}`)}>{t("common.continueLearning")}</Link>
                  </Button>
                ) : null}
                <Button asChild>
                  <Link href={link("/practice/reading/words")}>{t("practice.cards.readingWords.title")}</Link>
                </Button>
              </div>
            }
          />

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("practice.review.suggestedLessons")}</CardTitle>
              <CardDescription>{t("practice.review.suggestedDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestedLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={link(`/lessons/${lesson.slug}`)}
                  className="block rounded-2xl border border-border/80 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{lesson.title}</p>
                    <Badge variant="secondary">HSK {lesson.hskLevel}</Badge>
                  </div>
                  {lesson.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{lesson.description}</p>
                  ) : null}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <ReviewStudyExperience items={dueItems} schedulerSettings={schedulerSettings} />
      )}
    </div>
  );
}
