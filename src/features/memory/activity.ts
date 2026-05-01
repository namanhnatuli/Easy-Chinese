import type { SupabaseClient } from "@supabase/supabase-js";

export async function countSuccessfulLearningActivitiesToday({
  supabase,
  userId,
  from,
  to,
}: {
  supabase: SupabaseClient;
  userId: string;
  from: string;
  to: string;
}) {
  const [
    { count: reviewCount, error: reviewError },
    { count: practiceCount, error: practiceError },
  ] = await Promise.all([
    supabase
      .from("review_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("grade", ["hard", "good", "easy"])
      .gte("reviewed_at", from)
      .lt("reviewed_at", to),
    supabase
      .from("practice_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("result", ["completed", "difficult", "correct", "almost"])
      .gte("created_at", from)
      .lt("created_at", to),
  ]);

  if (reviewError) {
    throw reviewError;
  }

  if (practiceError) {
    throw practiceError;
  }

  return (reviewCount ?? 0) + (practiceCount ?? 0);
}
