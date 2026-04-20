import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { resolveBootstrapRole } from "@/lib/admin-bootstrap";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Profile, StoredUserRole } from "@/types/domain";

const profileThemeSchema = z.enum(["light", "dark", "system"]);
const profileFontSchema = z.enum(["sans", "serif", "kai"]);
const storedUserRoleSchema = z.enum(["user", "admin"]);

const profileRowSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  role: storedUserRoleSchema,
  preferred_language: z.string(),
  preferred_theme: profileThemeSchema,
  preferred_font: profileFontSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

type ProfileRow = z.infer<typeof profileRowSchema>;

function getDisplayName(user: User): string | null {
  return (
    user.user_metadata?.display_name ??
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    null
  );
}

function getAvatarUrl(user: User): string | null {
  return user.user_metadata?.avatar_url ?? null;
}

function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    preferredLanguage: row.preferred_language,
    preferredTheme: row.preferred_theme,
    preferredFont: row.preferred_font,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProfileForUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, avatar_url, role, preferred_language, preferred_theme, preferred_font, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapProfileRow(profileRowSchema.parse(data));
}

export async function getStoredRoleForUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<StoredUserRole | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return storedUserRoleSchema.parse(data.role);
}

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<Profile> {
  const existingProfile = await getProfileForUserId(supabase, user.id);
  const desiredRole = resolveBootstrapRole(user.email, existingProfile?.role ?? null);

  const payload = {
    id: user.id,
    email: user.email ?? null,
    display_name: getDisplayName(user),
    avatar_url: getAvatarUrl(user),
    role: desiredRole,
    preferred_language: existingProfile?.preferredLanguage ?? "en",
    preferred_theme: existingProfile?.preferredTheme ?? ("system" as const),
    preferred_font: existingProfile?.preferredFont ?? ("sans" as const),
  };

  // Skip upsert if the profile exists and critical fields haven't changed.
  // This avoids redundant DB writes and excessive logging on every request.
  if (
    existingProfile &&
    existingProfile.role === desiredRole &&
    existingProfile.email === payload.email &&
    existingProfile.displayName === payload.display_name &&
    existingProfile.avatarUrl === payload.avatar_url
  ) {
    return existingProfile;
  }

  const writeClient =
    desiredRole === "admin"
      ? createSupabaseAdminClient()
      : supabase;

  const { data, error } = await writeClient
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id, email, display_name, avatar_url, role, preferred_language, preferred_theme, preferred_font, created_at, updated_at",
    )
    .single();

  if (error) {
    logger.error("profile_bootstrap_failed", error, {
      userId: user.id,
      email: user.email ?? null,
      desiredRole,
    });
    throw error;
  }

  logger.info("profile_bootstrap_completed", {
    userId: user.id,
    email: user.email ?? null,
    desiredRole,
    usedAdminClient: writeClient !== supabase,
  });

  return mapProfileRow(profileRowSchema.parse(data));
}
