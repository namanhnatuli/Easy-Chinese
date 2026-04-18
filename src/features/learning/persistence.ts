import type { SupabaseClient } from "@supabase/supabase-js";

import { buildWordProgressPatch, type ExistingWordProgressSnapshot } from "@/features/learning/progress";
import type { StudyOutcomeSubmission } from "@/features/learning/types";
import { logger } from "@/lib/logger";

export async function persistStudyOutcome({
  supabase,
  userId,
  input,
}: {
  supabase: SupabaseClient;
  userId: string;
  input: StudyOutcomeSubmission;
}) {
  logger.info("study_outcome_persist_started", {
    userId,
    wordId: input.wordId,
    lessonId: input.lessonId ?? null,
    mode: input.mode,
    result: input.result,
  });

  const { data: existingProgress, error: progressReadError } = await supabase
    .from("user_word_progress")
    .select("status, correct_count, incorrect_count, streak_count, interval_days, ease_factor")
    .eq("user_id", userId)
    .eq("word_id", input.wordId)
    .maybeSingle();

  if (progressReadError) {
    throw progressReadError;
  }

  if (input.lessonId) {
    const { data: lessonMembership, error: membershipError } = await supabase
      .from("lesson_words")
      .select("word_id")
      .eq("lesson_id", input.lessonId)
      .eq("word_id", input.wordId)
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!lessonMembership) {
      throw new Error("The reviewed word does not belong to this lesson.");
    }
  } else if (!existingProgress) {
    throw new Error("This word is not available in the review queue.");
  }

  const now = new Date();
  const progressPatch = buildWordProgressPatch(
    existingProgress
      ? {
          status: existingProgress.status,
          correctCount: existingProgress.correct_count,
          incorrectCount: existingProgress.incorrect_count,
          streakCount: existingProgress.streak_count,
          intervalDays: existingProgress.interval_days,
          easeFactor: Number(existingProgress.ease_factor),
        }
      : null satisfies ExistingWordProgressSnapshot | null,
    input.result,
    now,
  );

  const { error: reviewEventError } = await supabase.from("review_events").insert({
    user_id: userId,
    word_id: input.wordId,
    mode: input.mode,
    result: input.result,
    reviewed_at: now.toISOString(),
  });

  if (reviewEventError) {
    throw reviewEventError;
  }

  const { error: wordProgressError } = await supabase.from("user_word_progress").upsert(
    {
      user_id: userId,
      word_id: input.wordId,
      ...progressPatch,
    },
    { onConflict: "user_id,word_id" },
  );

  if (wordProgressError) {
    throw wordProgressError;
  }

  if (input.lessonId) {
    const completionPercent = Math.max(0, Math.min(100, input.completionPercent));
    const { error: lessonProgressError } = await supabase.from("user_lesson_progress").upsert(
      {
        user_id: userId,
        lesson_id: input.lessonId,
        completion_percent: completionPercent,
        last_studied_at: now.toISOString(),
        completed_at: completionPercent >= 100 ? now.toISOString() : null,
      },
      { onConflict: "user_id,lesson_id" },
    );

    if (lessonProgressError) {
      throw lessonProgressError;
    }
  }

  logger.info("study_outcome_persist_completed", {
    userId,
    wordId: input.wordId,
    lessonId: input.lessonId ?? null,
    status: progressPatch.status,
    nextReviewAt: progressPatch.next_review_at,
    intervalDays: progressPatch.interval_days,
  });
}
