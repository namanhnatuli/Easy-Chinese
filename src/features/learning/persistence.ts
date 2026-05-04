import type { SupabaseClient } from "@supabase/supabase-js";

import { XP_VALUES } from "@/features/gamification/constants";
import { awardXp, unlockEligibleAchievements } from "@/features/gamification/persistence";
import { getXpForReviewResult } from "@/features/gamification/leveling";
import { buildWordProgressPatch, type ExistingWordProgressSnapshot } from "@/features/learning/progress";
import {
  persistLearningStats,
  persistWordMemoryGrade,
} from "@/features/memory/persistence";
import { mapMemoryGradeToReviewResult, mapReviewResultToMemoryGrade } from "@/features/memory/spaced-repetition";
import type { StudyOutcomeSubmission } from "@/features/learning/types";
import { logger } from "@/lib/logger";

function getUtcDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function readExistingWordProgress(
  supabase: SupabaseClient,
  userId: string,
  wordId: string,
  senseId?: string | null,
) {
  const selectColumns =
    "id, status, correct_count, incorrect_count, streak_count, interval_days, ease_factor";

  if (senseId) {
    const exact = await supabase
      .from("user_word_progress")
      .select(selectColumns)
      .eq("user_id", userId)
      .eq("word_id", wordId)
      .eq("sense_id", senseId)
      .maybeSingle();

    if (exact.error) {
      throw exact.error;
    }

    if (exact.data) {
      return exact.data;
    }

    const legacy = await supabase
      .from("user_word_progress")
      .select(selectColumns)
      .eq("user_id", userId)
      .eq("word_id", wordId)
      .is("sense_id", null)
      .maybeSingle();

    if (legacy.error) {
      throw legacy.error;
    }

    return legacy.data;
  }

  const result = await supabase
    .from("user_word_progress")
    .select(selectColumns)
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .is("sense_id", null)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

export async function persistStudyOutcome({
  supabase,
  userId,
  input,
}: {
  supabase: SupabaseClient;
  userId: string;
  input: StudyOutcomeSubmission;
}) {
  let existingLessonCompletionPercent = 0;

  logger.info("study_outcome_persist_started", {
    userId,
    wordId: input.wordId,
    senseId: input.senseId ?? null,
    lessonId: input.lessonId ?? null,
    mode: input.mode,
    result: input.result,
  });

  const existingProgress = await readExistingWordProgress(
    supabase,
    userId,
    input.wordId,
    input.senseId,
  );

  let existingMemory: { due_at: string | null; state: string } | null = null;

  if (input.lessonId) {
    let lessonMembership: { word_id: string } | null = null;

    if (input.senseId) {
      const exactMembership = await supabase
        .from("lesson_words")
        .select("word_id")
        .eq("lesson_id", input.lessonId)
        .eq("word_id", input.wordId)
        .eq("sense_id", input.senseId)
        .maybeSingle();

      if (exactMembership.error) {
        throw exactMembership.error;
      }

      lessonMembership = exactMembership.data;

      if (!lessonMembership) {
        const legacyMembership = await supabase
          .from("lesson_words")
          .select("word_id")
          .eq("lesson_id", input.lessonId)
          .eq("word_id", input.wordId)
          .is("sense_id", null)
          .maybeSingle();

        if (legacyMembership.error) {
          throw legacyMembership.error;
        }

        lessonMembership = legacyMembership.data;
      }
    } else {
      const membership = await supabase
        .from("lesson_words")
        .select("word_id")
        .eq("lesson_id", input.lessonId)
        .eq("word_id", input.wordId)
        .maybeSingle();

      if (membership.error) {
        throw membership.error;
      }

      lessonMembership = membership.data;
    }

    if (!lessonMembership) {
      throw new Error("The reviewed word does not belong to this lesson.");
    }

    const { data: existingLessonProgress, error: lessonProgressReadError } = await supabase
      .from("user_lesson_progress")
      .select("completion_percent")
      .eq("user_id", userId)
      .eq("lesson_id", input.lessonId)
      .maybeSingle();

    if (lessonProgressReadError) {
      throw lessonProgressReadError;
    }

    existingLessonCompletionPercent = Number(existingLessonProgress?.completion_percent ?? 0);
  } else {
    if (input.senseId) {
      const exactMemory = await supabase
        .from("user_word_memory")
        .select("due_at, state")
        .eq("user_id", userId)
        .eq("word_id", input.wordId)
        .eq("sense_id", input.senseId)
        .maybeSingle();

      if (exactMemory.error) {
        throw exactMemory.error;
      }

      existingMemory = exactMemory.data;

      if (!existingMemory) {
        const legacyMemory = await supabase
          .from("user_word_memory")
          .select("due_at, state")
          .eq("user_id", userId)
          .eq("word_id", input.wordId)
          .is("sense_id", null)
          .maybeSingle();

        if (legacyMemory.error) {
          throw legacyMemory.error;
        }

        existingMemory = legacyMemory.data;
      }
    } else {
      const memoryResult = await supabase
        .from("user_word_memory")
        .select("due_at, state")
        .eq("user_id", userId)
        .eq("word_id", input.wordId)
        .is("sense_id", null)
        .maybeSingle();

      if (memoryResult.error) {
        throw memoryResult.error;
      }

      existingMemory = memoryResult.data;
    }

    if (!existingMemory?.due_at || new Date(existingMemory.due_at) > new Date()) {
      throw new Error("This word is not available in the review queue.");
    }
  }

  const now = new Date();
  const grade = input.grade ?? mapReviewResultToMemoryGrade(input.result);
  const legacyResult = mapMemoryGradeToReviewResult(grade);
  const memoryTransition = await persistWordMemoryGrade({
    supabase,
    userId,
    wordId: input.wordId,
    senseId: input.senseId,
    grade,
    now,
    mode: input.mode,
    practiceType: input.lessonId ? `lesson_${input.mode}` : `review_${input.mode}`,
  });

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
    legacyResult,
    now,
    memoryTransition.next,
  );

  const wordProgressPayload = {
    user_id: userId,
    word_id: input.wordId,
    sense_id: input.senseId ?? null,
    ...progressPatch,
  };

  if (existingProgress?.id) {
    const { error: wordProgressError } = await supabase
      .from("user_word_progress")
      .update(wordProgressPayload)
      .eq("id", existingProgress.id)
      .eq("user_id", userId);

    if (wordProgressError) {
      throw wordProgressError;
    }
  } else {
    const { error: wordProgressError } = await supabase
      .from("user_word_progress")
      .insert(wordProgressPayload);

    if (wordProgressError) {
      throw wordProgressError;
    }
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

  await persistLearningStats({
    supabase,
    userId,
    now,
  });

  await awardXp({
    supabase,
    userId,
    amount: getXpForReviewResult(legacyResult),
    reason: `review:${input.mode}:${legacyResult}`,
    sourceKey: `review:${input.wordId}:${input.senseId ?? "word"}:${getUtcDateKey(now)}`,
  });

  if (input.lessonId && existingLessonCompletionPercent < 100 && input.completionPercent >= 100) {
    await awardXp({
      supabase,
      userId,
      amount: XP_VALUES.lessonCompletedBonus,
      reason: `lesson_completed:${input.lessonId}`,
      sourceKey: `lesson_completed:${input.lessonId}`,
    });
  }

  await unlockEligibleAchievements({
    supabase,
    userId,
    now,
  });

  logger.info("study_outcome_persist_completed", {
    userId,
    wordId: input.wordId,
    senseId: input.senseId ?? null,
    lessonId: input.lessonId ?? null,
    status: progressPatch.status,
    dueAt: memoryTransition.next.dueAt,
    intervalDays: memoryTransition.next.intervalDays,
    memoryState: memoryTransition.next.state,
  });
}
