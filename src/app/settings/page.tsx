import { SettingsForm } from "@/components/settings/settings-form";
import { DEFAULT_LEARNING_SCHEDULER_SETTINGS } from "@/features/memory/spaced-repetition";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const context = await requirePermission("settings.read");
  const profile = context.profile;

  if (!profile) {
    throw new Error("Authenticated profile could not be loaded.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: learningStats, error } = await supabase
    .from("user_learning_stats")
    .select("daily_goal, scheduler_type, desired_retention, maximum_interval_days")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (
    <SettingsForm
      profile={profile}
      learningSettings={
        learningStats
          ? {
              dailyGoal: learningStats.daily_goal ?? 10,
              schedulerType:
                learningStats.scheduler_type === "sm2"
                  ? "sm2"
                  : DEFAULT_LEARNING_SCHEDULER_SETTINGS.schedulerType,
              desiredRetention: Number(learningStats.desired_retention ?? 0.9),
              maximumIntervalDays: learningStats.maximum_interval_days ?? 36500,
            }
          : null
      }
    />
  );
}
