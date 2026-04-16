import type { Permission } from "@/lib/permissions";
import type { StoredUserRole } from "@/types/domain";

const permissionRoutes: Array<{ prefix: string; permission: Permission }> = [
  { prefix: "/dashboard", permission: "dashboard.read" },
  { prefix: "/settings", permission: "settings.read" },
  { prefix: "/admin", permission: "admin.access" },
];

export function getRequiredPermissionForPath(pathname: string): Permission | null {
  const match = permissionRoutes.find(
    (route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`),
  );

  return match?.permission ?? null;
}

export function isAuthPage(pathname: string): boolean {
  return pathname === "/auth/sign-in";
}

export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  if (next.startsWith("/auth/callback") || next.startsWith("/auth/sign-in")) {
    return null;
  }

  return next;
}

export function getDefaultAuthenticatedPath(role: StoredUserRole): string {
  return role === "admin" ? "/admin" : "/dashboard";
}
