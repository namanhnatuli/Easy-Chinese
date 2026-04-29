import { SettingsForm } from "@/components/settings/settings-form";
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
    .select("scheduler_type, desired_retention, maximum_interval_days")
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
              schedulerType: learningStats.scheduler_type === "fsrs" ? "fsrs" : "sm2",
              desiredRetention: Number(learningStats.desired_retention ?? 0.9),
              maximumIntervalDays: learningStats.maximum_interval_days ?? 36500,
            }
          : null
      }
    />
  );
}
