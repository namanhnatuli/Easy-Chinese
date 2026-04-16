import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Profile, StoredUserRole } from "@/types/domain";

const profileThemeSchema = z.enum(["light", "dark", "system"]);
const profileFontSchema = z.enum(["sans", "serif"]);
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

function getRole(user: User): StoredUserRole {
  return user.user_metadata?.role === "admin" ? "admin" : "user";
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
  const payload = {
    id: user.id,
    email: user.email ?? null,
    display_name: getDisplayName(user),
    avatar_url: getAvatarUrl(user),
    role: getRole(user),
    preferred_language: "vi",
    preferred_theme: "system" as const,
    preferred_font: "sans" as const,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id, email, display_name, avatar_url, role, preferred_language, preferred_theme, preferred_font, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapProfileRow(profileRowSchema.parse(data));
}
