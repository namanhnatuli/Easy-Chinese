import Link from "next/link";

import { ReviewStudyExperience } from "@/components/learning/review-study-experience";
import { HeaderActions, HeaderLinkButton, PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listDueReviewItems, listRecentLessonProgress, listSuggestedLessons } from "@/features/progress/queries";
import { requirePermission } from "@/lib/auth";

export default async function ReviewPage() {
  const context = await requirePermission("dashboard.read");
  const [dueItems, recentLessons, suggestedLessons] = await Promise.all([
    listDueReviewItems(context.user!.id, 30),
    listRecentLessonProgress(context.user!.id, 3),
    listSuggestedLessons(3),
  ]);

  const continueLesson = recentLessons.find(
    (lesson) => lesson.completionPercent > 0 && lesson.completionPercent < 100,
  );

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Review"
        badge="Authenticated"
        title="Due review queue"
        description="Clear the words that are due now or overdue, then return to lessons for fresh material."
        actions={
          <HeaderActions
            secondary={
              <HeaderLinkButton href="/dashboard" variant="outline">
                Dashboard
              </HeaderLinkButton>
            }
            primary={
              <>
                {continueLesson ? (
                  <HeaderLinkButton href={`/learn/lesson/${continueLesson.lessonId}`} variant="outline">
                    Continue learning
                  </HeaderLinkButton>
                ) : null}
                <HeaderLinkButton href="/lessons">Browse lessons</HeaderLinkButton>
              </>
            }
          />
        }
      />

      {dueItems.length === 0 ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <EmptyState
            title="Nothing is due right now"
            description="Your saved queue is clear. Continue a lesson to create more review items, or browse published lessons for something new."
            action={
              <div className="flex flex-wrap gap-3">
                {continueLesson ? (
                  <Button asChild variant="outline">
                    <Link href={`/learn/lesson/${continueLesson.lessonId}`}>Continue learning</Link>
                  </Button>
                ) : null}
                <Button asChild>
                  <Link href="/lessons">Browse lessons</Link>
                </Button>
              </div>
            }
          />

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>Suggested next lessons</CardTitle>
              <CardDescription>Keep building the queue with published content.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestedLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/lessons/${lesson.slug}`}
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
