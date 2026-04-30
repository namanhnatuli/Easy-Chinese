import type { SupabaseClient } from "@supabase/supabase-js";

import { userSettingsSchema } from "@/features/settings/schema";
import { normalizeLearningSchedulerSettings } from "@/features/memory/spaced-repetition";
import { getProfileForUserId } from "@/features/auth/profile";
import { normalizeFontPreference, normalizeLanguage, normalizeThemePreference } from "@/features/settings/preferences";
import type { UserSettingsInput } from "@/features/settings/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function updateUserSettings({
  supabase,
  userId,
  input,
}: {
  supabase: SupabaseClient;
  userId: string;
  input: UserSettingsInput;
}) {
  const parsed = userSettingsSchema.parse(input);
  const existingProfile = await getProfileForUserId(supabase, userId);

  if (!existingProfile) {
    throw new Error("Profile not found.");
  }

  const adminSupabase = createSupabaseAdminClient();

  const { error } = await adminSupabase
    .from("profiles")
    .update({
      preferred_language: normalizeLanguage(parsed.language),
      preferred_theme: normalizeThemePreference(parsed.theme),
      preferred_font: normalizeFontPreference(parsed.font),
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }

  const schedulerSettings = normalizeLearningSchedulerSettings({
    schedulerType: parsed.schedulerType,
    desiredRetention: parsed.desiredRetention,
    maximumIntervalDays: parsed.maximumIntervalDays,
  });

  const { error: learningStatsError } = await supabase.from("user_learning_stats").upsert(
    {
      user_id: userId,
      daily_goal: parsed.dailyGoal,
      scheduler_type: schedulerSettings.schedulerType,
      desired_retention: schedulerSettings.desiredRetention,
      maximum_interval_days: schedulerSettings.maximumIntervalDays,
    },
    { onConflict: "user_id" },
  );

  if (learningStatsError) {
    throw learningStatsError;
  }
}
