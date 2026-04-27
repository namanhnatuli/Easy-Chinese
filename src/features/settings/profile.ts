import type { SupabaseClient } from "@supabase/supabase-js";

import { userSettingsSchema } from "@/features/settings/schema";
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
}
