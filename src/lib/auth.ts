import { redirect } from "next/navigation";

import { ensureProfileForUser, getProfileForUserId } from "@/features/auth/profile";
import { getDefaultAuthenticatedPath } from "@/features/auth/routes";
import { hasPermission, type Permission } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthUser, Profile, UserRole } from "@/types/domain";

export interface AuthContext {
  user: AuthUser | null;
  profile: Profile | null;
  role: UserRole;
}

function mapToAuthUser(profile: Profile): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile =
    (await getProfileForUserId(supabase, user.id)) ??
    (await ensureProfileForUser(supabase, user));

  return mapToAuthUser(profile);
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return (
    (await getProfileForUserId(supabase, user.id)) ??
    (await ensureProfileForUser(supabase, user))
  );
}

export async function getCurrentRole(): Promise<UserRole> {
  const user = await getCurrentUser();
  return user?.role ?? "anonymous";
}

export async function getAuthContext(): Promise<AuthContext> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return {
      user: null,
      profile: null,
      role: "anonymous",
    };
  }

  return {
    user: mapToAuthUser(profile),
    profile,
    role: profile.role,
  };
}

export async function requireAuthenticatedUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return user;
}

export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!hasPermission(context.role, permission)) {
    if (context.role === "anonymous") {
      redirect("/auth/sign-in");
    }

    if (context.user) {
      redirect(getDefaultAuthenticatedPath(context.user.role));
    }

    redirect("/");
  }

  return context;
}

export async function requireAdminUser(): Promise<AuthContext> {
  return requirePermission("admin.access");
}
