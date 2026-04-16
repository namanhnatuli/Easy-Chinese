import type { UserRole } from "@/types/domain";

export type Permission =
  | "content.read"
  | "dashboard.read"
  | "settings.read"
  | "settings.write"
  | "admin.access"
  | "profile.read"
  | "profile.write";

const rolePermissions: Record<UserRole, Permission[]> = {
  anonymous: ["content.read"],
  user: [
    "content.read",
    "dashboard.read",
    "settings.read",
    "settings.write",
    "profile.read",
    "profile.write",
  ],
  admin: [
    "content.read",
    "dashboard.read",
    "settings.read",
    "settings.write",
    "admin.access",
    "profile.read",
    "profile.write",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function isAdminRole(role: UserRole): boolean {
  return role === "admin";
}

export function isAuthenticatedRole(role: UserRole): boolean {
  return role === "user" || role === "admin";
}

export function canPersistProgress(role: UserRole): boolean {
  return role === "user" || role === "admin";
}

export function canAccessDashboard(role: UserRole): boolean {
  return hasPermission(role, "dashboard.read");
}

export function canAccessSettings(role: UserRole): boolean {
  return hasPermission(role, "settings.read");
}

export function canAccessAdmin(role: UserRole): boolean {
  return hasPermission(role, "admin.access");
}
