import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildLearningStatsPatch,
  buildWordMemoryPatch,
  getDefaultDailyGoal,
  mapMemoryGradeToReviewResult,
  type ExistingWordMemorySnapshot,
  type LearningSchedulerSettings,
  type SchedulerTransition,
  applySchedulerGrade,
  resolveLearningSchedulerSettings,
} from "@/features/memory/spaced-repetition";
import { logger } from "@/lib/logger";
import type { ReviewMode, SchedulerGrade } from "@/types/domain";

async function readExistingWordMemory(
  supabase: SupabaseClient,
  userId: string,
  wordId: string,
): Promise<ExistingWordMemorySnapshot | null> {
  const { data, error } = await supabase
    .from("user_word_memory")
    .select(
      "scheduler_type, state, ease_factor, interval_days, due_at, reps, lapses, learning_step_index, fsrs_stability, fsrs_difficulty, fsrs_retrievability, scheduled_days, elapsed_days, last_reviewed_at, last_grade",
    )
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    schedulerType: data.scheduler_type === "fsrs" ? "fsrs" : "sm2",
    state: data.state,
    easeFactor: Number(data.ease_factor),
    intervalDays: data.interval_days,
    dueAt: data.due_at,
    reps: data.reps,
    lapses: data.lapses,
    learningStepIndex: data.learning_step_index,
    fsrsStability: data.fsrs_stability === null ? null : Number(data.fsrs_stability),
    fsrsDifficulty: data.fsrs_difficulty === null ? null : Number(data.fsrs_difficulty),
    fsrsRetrievability: data.fsrs_retrievability === null ? null : Number(data.fsrs_retrievability),
    scheduledDays: data.scheduled_days ?? 0,
    elapsedDays: data.elapsed_days ?? 0,
    lastReviewedAt: data.last_reviewed_at,
    lastGrade: data.last_grade,
  };
}

async function readExistingLearningStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<(LearningSchedulerSettings & { streakCount: number; lastActiveDate: string | null; dailyGoal: number }) | null> {
  const { data, error } = await supabase
    .from("user_learning_stats")
    .select("streak_count, last_active_date, daily_goal, scheduler_type, desired_retention, maximum_interval_days")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    streakCount: data.streak_count,
    lastActiveDate: data.last_active_date,
    dailyGoal: data.daily_goal,
    schedulerType: data.scheduler_type === "fsrs" ? "fsrs" : "sm2",
    desiredRetention: Number(data.desired_retention ?? 0.9),
    maximumIntervalDays: data.maximum_interval_days ?? 36500,
  };
}

async function countCompletedToday(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
) {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const from = dayStart.toISOString();
  const to = dayEnd.toISOString();

  const { count, error } = await supabase
    .from("review_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("grade", ["hard", "good", "easy"])
    .gte("reviewed_at", from)
    .lt("reviewed_at", to);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

function getWordMemoryLogPayload(transition: SchedulerTransition, userId: string, wordId: string, grade: SchedulerGrade) {
  return {
    userId,
    wordId,
    grade,
    schedulerType: transition.next.schedulerType,
    previousState: transition.previous.state,
    nextState: transition.next.state,
    intervalDays: transition.next.intervalDays,
    reps: transition.next.reps,
    lapses: transition.next.lapses,
    dueAt: transition.next.dueAt,
  };
}

async function insertReviewEvent({
  supabase,
  userId,
  wordId,
  practiceType,
  grade,
  previous,
  next,
  now,
  mode,
}: {
  supabase: SupabaseClient;
  userId: string;
  wordId: string;
  practiceType: string;
  grade: SchedulerGrade;
  previous: SchedulerTransition["previous"];
  next: SchedulerTransition["next"];
  now: Date;
  mode?: ReviewMode | null;
}) {
  const { error } = await supabase.from("review_events").insert({
    user_id: userId,
    word_id: wordId,
    mode: mode ?? null,
    result: mapMemoryGradeToReviewResult(grade),
    scheduler_type: next.schedulerType,
    practice_type: practiceType,
    grade,
    previous_state: previous.state,
    next_state: next.state,
    previous_interval_days: previous.intervalDays,
    next_interval_days: next.intervalDays,
    previous_stability: previous.fsrsStability,
    next_stability: next.fsrsStability,
    previous_difficulty: previous.fsrsDifficulty,
    next_difficulty: next.fsrsDifficulty,
    previous_retrievability: previous.fsrsRetrievability,
    next_retrievability: next.fsrsRetrievability,
    previous_due_at: previous.dueAt,
    next_due_at: next.dueAt,
    reviewed_at: now.toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function persistWordMemoryGrade({
  supabase,
  userId,
  wordId,
  grade,
  now,
  practiceType,
  mode,
}: {
  supabase: SupabaseClient;
  userId: string;
  wordId: string;
  grade: SchedulerGrade;
  now: Date;
  practiceType: string;
  mode?: ReviewMode | null;
}) {
  const [existing, learningStats] = await Promise.all([
    readExistingWordMemory(supabase, userId, wordId),
    readExistingLearningStats(supabase, userId),
  ]);
  const schedulerSettings = resolveLearningSchedulerSettings(existing, learningStats);
  const transition = applySchedulerGrade({
    existing,
    grade,
    now,
    settings: schedulerSettings,
  });
  const patch = buildWordMemoryPatch(existing, grade, now, schedulerSettings);

  const { error } = await supabase.from("user_word_memory").upsert(
    {
      user_id: userId,
      word_id: wordId,
      ...patch,
    },
    { onConflict: "user_id,word_id" },
  );

  if (error) {
    throw error;
  }

  await insertReviewEvent({
    supabase,
    userId,
    wordId,
    practiceType,
    grade,
    previous: transition.previous,
    next: transition.next,
    now,
    mode,
  });

  logger.info("user_word_memory_persisted", getWordMemoryLogPayload(transition, userId, wordId, grade));

  return transition;
}

export async function persistLearningStats({
  supabase,
  userId,
  now,
}: {
  supabase: SupabaseClient;
  userId: string;
  now: Date;
}) {
  const [existing, completedToday] = await Promise.all([
    readExistingLearningStats(supabase, userId),
    countCompletedToday(supabase, userId, now),
  ]);

  const patch = buildLearningStatsPatch({
    existing: existing ?? {
      streakCount: 0,
      lastActiveDate: null,
      dailyGoal: getDefaultDailyGoal(),
      schedulerType: "sm2",
      desiredRetention: 0.9,
      maximumIntervalDays: 36500,
    },
    completedToday,
    now,
  });

  const { error } = await supabase.from("user_learning_stats").upsert(
    {
      user_id: userId,
      ...patch,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }

  logger.info("user_learning_stats_persisted", {
    userId,
    completedToday,
    streakCount: patch.streak_count,
    lastActiveDate: patch.last_active_date,
    dailyGoal: patch.daily_goal,
  });
}
