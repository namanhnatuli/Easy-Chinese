import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildLearningStatsPatch,
  DEFAULT_LEARNING_SCHEDULER_SETTINGS,
  buildWordMemoryPatch,
  getDefaultDailyGoal,
  mapMemoryGradeToReviewResult,
  type ExistingWordMemorySnapshot,
  type LearningSchedulerSettings,
  type SchedulerTransition,
  applySchedulerGrade,
  resolveLearningSchedulerSettings,
} from "@/features/memory/spaced-repetition";
import { countSuccessfulLearningActivitiesToday } from "@/features/memory/activity";
import { logger } from "@/lib/logger";
import type { ReviewMode, SchedulerGrade } from "@/types/domain";

async function readExistingWordMemory(
  supabase: SupabaseClient,
  userId: string,
  wordId: string,
  senseId?: string | null,
): Promise<ExistingWordMemorySnapshot | null> {
  const selectColumns =
    "id, sense_id, scheduler_type, state, ease_factor, interval_days, due_at, reps, lapses, learning_step_index, fsrs_stability, fsrs_difficulty, fsrs_retrievability, scheduled_days, elapsed_days, last_reviewed_at, last_grade";
  let data: Record<string, unknown> | null = null;
  let error: unknown = null;

  if (senseId) {
    const exactResult = await supabase
      .from("user_word_memory")
      .select(selectColumns)
      .eq("user_id", userId)
      .eq("word_id", wordId)
      .eq("sense_id", senseId)
      .maybeSingle();

    if (exactResult.error) {
      throw exactResult.error;
    }

    data = exactResult.data;

    if (!data) {
      const legacyResult = await supabase
        .from("user_word_memory")
        .select(selectColumns)
        .eq("user_id", userId)
        .eq("word_id", wordId)
        .is("sense_id", null)
        .maybeSingle();

      data = legacyResult.data;
      error = legacyResult.error;
    }
  } else {
    const result = await supabase
      .from("user_word_memory")
      .select(selectColumns)
      .eq("user_id", userId)
      .eq("word_id", wordId)
      .is("sense_id", null)
      .maybeSingle();

    data = result.data;
    error = result.error;
  }

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    senseId: (data.sense_id as string | null | undefined) ?? null,
    schedulerType:
      data.scheduler_type === "sm2" ? "sm2" : DEFAULT_LEARNING_SCHEDULER_SETTINGS.schedulerType,
    state: data.state as ExistingWordMemorySnapshot["state"],
    easeFactor: Number(data.ease_factor),
    intervalDays: Number(data.interval_days ?? 0),
    dueAt: (data.due_at as string | null | undefined) ?? null,
    reps: Number(data.reps ?? 0),
    lapses: Number(data.lapses ?? 0),
    learningStepIndex: Number(data.learning_step_index ?? 0),
    fsrsStability: data.fsrs_stability === null ? null : Number(data.fsrs_stability),
    fsrsDifficulty: data.fsrs_difficulty === null ? null : Number(data.fsrs_difficulty),
    fsrsRetrievability: data.fsrs_retrievability === null ? null : Number(data.fsrs_retrievability),
    scheduledDays: Number(data.scheduled_days ?? 0),
    elapsedDays: Number(data.elapsed_days ?? 0),
    lastReviewedAt: (data.last_reviewed_at as string | null | undefined) ?? null,
    lastGrade: (data.last_grade as SchedulerGrade | null | undefined) ?? null,
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
    schedulerType:
      data.scheduler_type === "sm2" ? "sm2" : DEFAULT_LEARNING_SCHEDULER_SETTINGS.schedulerType,
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
  return countSuccessfulLearningActivitiesToday({
    supabase,
    userId,
    from: dayStart.toISOString(),
    to: dayEnd.toISOString(),
  });
}

function getWordMemoryLogPayload(
  transition: SchedulerTransition,
  userId: string,
  wordId: string,
  senseId: string | null | undefined,
  grade: SchedulerGrade,
) {
  return {
    userId,
    wordId,
    senseId: senseId ?? null,
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
  senseId,
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
  senseId?: string | null;
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
    sense_id: senseId ?? null,
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
  senseId,
  grade,
  now,
  practiceType,
  mode,
}: {
  supabase: SupabaseClient;
  userId: string;
  wordId: string;
  senseId?: string | null;
  grade: SchedulerGrade;
  now: Date;
  practiceType: string;
  mode?: ReviewMode | null;
}) {
  const [existing, learningStats] = await Promise.all([
    readExistingWordMemory(supabase, userId, wordId, senseId),
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

  const writePayload = {
    user_id: userId,
    word_id: wordId,
    sense_id: senseId ?? null,
    ...patch,
  };

  const { error } = existing?.id
    ? await supabase
        .from("user_word_memory")
        .update(writePayload)
        .eq("id", existing.id)
        .eq("user_id", userId)
    : await supabase.from("user_word_memory").insert(writePayload);

  if (error) {
    throw error;
  }

  await insertReviewEvent({
    supabase,
    userId,
    wordId,
    senseId,
    practiceType,
    grade,
    previous: transition.previous,
    next: transition.next,
    now,
    mode,
  });

  logger.info("user_word_memory_persisted", getWordMemoryLogPayload(transition, userId, wordId, senseId, grade));

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
      schedulerType: DEFAULT_LEARNING_SCHEDULER_SETTINGS.schedulerType,
      desiredRetention: DEFAULT_LEARNING_SCHEDULER_SETTINGS.desiredRetention,
      maximumIntervalDays: DEFAULT_LEARNING_SCHEDULER_SETTINGS.maximumIntervalDays,
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
