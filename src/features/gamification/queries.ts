import { createSupabaseServerClient } from "@/lib/supabase/server";

import { calculateLevelFromXp } from "@/features/gamification/leveling";
import type { AchievementKey } from "@/types/domain";

export interface DashboardAchievementItem {
  key: AchievementKey;
  earnedAt: string;
}

export interface GamificationDashboardSummary {
  totalXp: number;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  progressPercent: number;
  achievements: DashboardAchievementItem[];
}

export async function getGamificationDashboardSummary(
  userId: string,
): Promise<GamificationDashboardSummary> {
  const supabase = await createSupabaseServerClient();
  const [{ data: xpRow, error: xpError }, { data: levelRow, error: levelError }, { data: achievementRows, error: achievementError }] =
    await Promise.all([
      supabase.from("user_xp").select("total_xp").eq("user_id", userId).maybeSingle(),
      supabase.from("user_level").select("level, current_xp, next_level_xp").eq("user_id", userId).maybeSingle(),
      supabase
        .from("user_achievements")
        .select("achievement_key, earned_at")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false })
        .limit(6),
    ]);

  if (xpError) {
    throw xpError;
  }

  if (levelError) {
    throw levelError;
  }

  if (achievementError) {
    throw achievementError;
  }

  const totalXp = xpRow?.total_xp ?? 0;
  const fallbackLevel = calculateLevelFromXp(totalXp);
  const currentXp = levelRow?.current_xp ?? fallbackLevel.currentXp;
  const nextLevelXp = levelRow?.next_level_xp ?? fallbackLevel.nextLevelXp;
  const progressPercent =
    nextLevelXp <= 0 ? 0 : Math.round(Math.min((currentXp / nextLevelXp) * 100, 100));

  return {
    totalXp,
    level: levelRow?.level ?? fallbackLevel.level,
    currentXp,
    nextLevelXp,
    progressPercent,
    achievements: (achievementRows ?? []).map((row) => ({
      key: row.achievement_key as AchievementKey,
      earnedAt: row.earned_at,
    })),
  };
}
