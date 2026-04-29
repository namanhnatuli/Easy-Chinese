import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildLearningStatsPatch,
  buildWordMemoryPatch,
  getDefaultDailyGoal,
  mapMemoryGradeToReviewResult,
  type ExistingWordMemorySnapshot,
  type SchedulerTransition,
  applySchedulerGrade,
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
      "state, ease_factor, interval_days, due_at, reps, lapses, learning_step_index, last_reviewed_at, last_grade",
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
    state: data.state,
    easeFactor: Number(data.ease_factor),
    intervalDays: data.interval_days,
    dueAt: data.due_at,
    reps: data.reps,
    lapses: data.lapses,
    learningStepIndex: data.learning_step_index,
    lastReviewedAt: data.last_reviewed_at,
    lastGrade: data.last_grade,
  };
}

async function readExistingLearningStats(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_learning_stats")
    .select("streak_count, last_active_date, daily_goal")
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
    practice_type: practiceType,
    grade,
    previous_state: previous.state,
    next_state: next.state,
    previous_interval_days: previous.intervalDays,
    next_interval_days: next.intervalDays,
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
  const existing = await readExistingWordMemory(supabase, userId, wordId);
  const transition = applySchedulerGrade({
    existing,
    grade,
    now,
  });
  const patch = buildWordMemoryPatch(existing, grade, now);

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
