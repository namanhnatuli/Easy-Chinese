import type { SupabaseClient } from "@supabase/supabase-js";

import { XP_VALUES } from "@/features/gamification/constants";
import { calculateLevelFromXp } from "@/features/gamification/leveling";
import { logger } from "@/lib/logger";
import type { AchievementKey } from "@/types/domain";

async function readUserXp(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.total_xp ?? 0;
}

async function readTotalXpFromEvents(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_xp_events")
    .select("amount")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []).reduce((total, row) => total + Number(row.amount ?? 0), 0);
}

async function writeUserLevel(
  supabase: SupabaseClient,
  userId: string,
  totalXp: number,
) {
  const levelSnapshot = calculateLevelFromXp(totalXp);
  const { error } = await supabase.from("user_level").upsert(
    {
      user_id: userId,
      level: levelSnapshot.level,
      current_xp: levelSnapshot.currentXp,
      next_level_xp: levelSnapshot.nextLevelXp,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }

  return levelSnapshot;
}

export async function awardXp({
  supabase,
  userId,
  amount,
  reason,
  sourceKey,
}: {
  supabase: SupabaseClient;
  userId: string;
  amount: number;
  reason: string;
  sourceKey: string;
}) {
  if (amount <= 0) {
    return calculateLevelFromXp(await readUserXp(supabase, userId));
  }

  const { error: eventError } = await supabase.from("user_xp_events").insert({
    user_id: userId,
    source_key: sourceKey,
    reason,
    amount,
  });

  if (eventError) {
    if ("code" in eventError && eventError.code === "23505") {
      return calculateLevelFromXp(await readUserXp(supabase, userId));
    }

    throw eventError;
  }

  const nextTotalXp = await readTotalXpFromEvents(supabase, userId);
  const { error } = await supabase.from("user_xp").upsert(
    {
      user_id: userId,
      total_xp: nextTotalXp,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw error;
  }

  const levelSnapshot = await writeUserLevel(supabase, userId, nextTotalXp);

  logger.info("user_xp_awarded", {
    userId,
    amount,
    reason,
    totalXp: nextTotalXp,
    level: levelSnapshot.level,
  });

  return levelSnapshot;
}

async function hasAchievement(
  supabase: SupabaseClient,
  userId: string,
  achievementKey: AchievementKey,
) {
  const { data, error } = await supabase
    .from("user_achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_key", achievementKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function ensureAchievement({
  supabase,
  userId,
  achievementKey,
  now,
}: {
  supabase: SupabaseClient;
  userId: string;
  achievementKey: AchievementKey;
  now: Date;
}) {
  if (await hasAchievement(supabase, userId, achievementKey)) {
    return false;
  }

  const { error } = await supabase.from("user_achievements").insert({
    user_id: userId,
    achievement_key: achievementKey,
    earned_at: now.toISOString(),
  });

  if (error) {
    throw error;
  }

  await awardXp({
    supabase,
    userId,
    amount: XP_VALUES.achievementUnlockedBonus,
    reason: `achievement:${achievementKey}`,
    sourceKey: `achievement:${achievementKey}`,
  });

  logger.info("user_achievement_unlocked", {
    userId,
    achievementKey,
  });

  return true;
}

async function countCompletedLessons(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("user_lesson_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("completion_percent", 100);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function countLearnedWords(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("user_word_memory")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("reps", 0);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function countWrittenCharacters(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("user_writing_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function getStreakCount(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_learning_stats")
    .select("streak_count")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.streak_count ?? 0;
}

export async function unlockEligibleAchievements({
  supabase,
  userId,
  now,
}: {
  supabase: SupabaseClient;
  userId: string;
  now: Date;
}) {
  const [completedLessons, learnedWords, writtenCharacters, streakCount] = await Promise.all([
    countCompletedLessons(supabase, userId),
    countLearnedWords(supabase, userId),
    countWrittenCharacters(supabase, userId),
    getStreakCount(supabase, userId),
  ]);

  if (completedLessons >= 1) {
    await ensureAchievement({ supabase, userId, achievementKey: "first_lesson_completed", now });
  }

  if (streakCount >= 7) {
    await ensureAchievement({ supabase, userId, achievementKey: "seven_day_streak", now });
  }

  if (learnedWords >= 50) {
    await ensureAchievement({ supabase, userId, achievementKey: "fifty_words_learned", now });
  }

  if (writtenCharacters >= 100) {
    await ensureAchievement({ supabase, userId, achievementKey: "hundred_characters_written", now });
  }
}
