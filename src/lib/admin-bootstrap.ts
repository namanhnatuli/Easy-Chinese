import "server-only";

import { z } from "zod";

import type { StoredUserRole } from "@/types/domain";

const adminEmailsSchema = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function getAdminEmailsAllowlist(): string[] {
  return adminEmailsSchema.parse(process.env.ADMIN_EMAILS ?? "");
}

export function isAdminEmailAllowlisted(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return false;
  }

  return getAdminEmailsAllowlist().includes(normalized);
}

export function resolveBootstrapRole(
  email: string | null | undefined,
  currentRole: StoredUserRole | null,
): StoredUserRole {
  if (isAdminEmailAllowlisted(email)) {
    return "admin";
  }

  // Preserve an existing admin until an operator explicitly demotes them.
  // This avoids accidental lockout if ADMIN_EMAILS is temporarily misconfigured.
  if (currentRole === "admin") {
    return "admin";
  }

  return "user";
}
