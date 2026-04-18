import Link from "next/link";

import { ReviewStudyExperience } from "@/components/learning/review-study-experience";
import { HeaderActions, HeaderLinkButton, PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listDueReviewItems, listRecentLessonProgress, listSuggestedLessons } from "@/features/progress/queries";
import { getServerI18n } from "@/i18n/server";
import { requirePermission } from "@/lib/auth";

export default async function ReviewPage() {
  const context = await requirePermission("dashboard.read");
  const [dueItems, recentLessons, suggestedLessons] = await Promise.all([
    listDueReviewItems(context.user!.id, 30),
    listRecentLessonProgress(context.user!.id, 3),
    listSuggestedLessons(3),
  ]);
  const { t, link } = await getServerI18n(context.profile?.preferredLanguage);

  const continueLesson = recentLessons.find(
    (lesson) => lesson.completionPercent > 0 && lesson.completionPercent < 100,
  );

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("learning.reviewPage.eyebrow")}
        badge={t("common.authenticated")}
        title={t("learning.reviewPage.title")}
        description={t("learning.reviewPage.description")}
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
                  <HeaderLinkButton href={link(`/learn/lesson/${continueLesson.lessonId}`)} variant="outline">
                    {t("common.continueLearning")}
                  </HeaderLinkButton>
                ) : null}
                <HeaderLinkButton href={link("/lessons")}>{t("common.browseLessons")}</HeaderLinkButton>
              </>
            }
          />
        }
      />

      {dueItems.length === 0 ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <EmptyState
            title={t("learning.reviewPage.emptyTitle")}
            description={t("learning.reviewPage.emptyDescription")}
            action={
              <div className="flex flex-wrap gap-3">
                {continueLesson ? (
                  <Button asChild variant="outline">
                    <Link href={link(`/learn/lesson/${continueLesson.lessonId}`)}>{t("common.continueLearning")}</Link>
                  </Button>
                ) : null}
                <Button asChild>
                  <Link href={link("/lessons")}>{t("common.browseLessons")}</Link>
                </Button>
              </div>
            }
          />

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("learning.reviewPage.suggestedLessons")}</CardTitle>
              <CardDescription>{t("learning.reviewPage.suggestedDescription")}</CardDescription>
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
        <ReviewStudyExperience items={dueItems} />
      )}
    </div>
  );
}
