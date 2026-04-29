import { ReviewPageContent } from "@/components/practice/review-page-content";
import { getUserLearningSchedulerSettings } from "@/features/memory/queries";
import { listDueReviewItems, listRecentLessonProgress, listSuggestedLessonsForUser } from "@/features/progress/queries";
import { requirePermission } from "@/lib/auth";

export default async function PracticeReviewPage() {
  const context = await requirePermission("dashboard.read");
  const [dueItems, recentLessons, suggestedLessons, schedulerSettings] = await Promise.all([
    listDueReviewItems(context.user!.id, 30),
    listRecentLessonProgress(context.user!.id, 3),
    listSuggestedLessonsForUser(context.user!.id, 3),
    getUserLearningSchedulerSettings(context.user!.id),
  ]);

  const continueLesson = recentLessons.find(
    (lesson) => lesson.completionPercent > 0 && lesson.completionPercent < 100,
  );

  return (
    <ReviewPageContent
      dueItems={dueItems}
      suggestedLessons={suggestedLessons}
      continueLesson={
        continueLesson
          ? {
              id: continueLesson.lessonId,
              title: continueLesson.title,
              slug: continueLesson.slug,
              hskLevel: continueLesson.hskLevel,
              description: null,
            }
          : null
      }
      schedulerSettings={schedulerSettings}
    />
  );
}
