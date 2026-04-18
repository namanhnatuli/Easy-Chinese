import assert from "node:assert/strict";
import test from "node:test";

import {
  getDefaultAuthenticatedPath,
  getRequiredPermissionForPath,
  sanitizeNextPath,
} from "@/features/auth/routes";

test("protected routes map to the expected permissions", () => {
  assert.equal(getRequiredPermissionForPath("/dashboard"), "dashboard.read");
  assert.equal(getRequiredPermissionForPath("/review"), "dashboard.read");
  assert.equal(getRequiredPermissionForPath("/settings"), "settings.read");
  assert.equal(getRequiredPermissionForPath("/admin/words"), "admin.access");
  assert.equal(getRequiredPermissionForPath("/lessons"), null);
});

test("next path sanitization blocks unsafe and auth callback destinations", () => {
  assert.equal(sanitizeNextPath("/dashboard"), "/dashboard");
  assert.equal(sanitizeNextPath("//evil.test"), null);
  assert.equal(sanitizeNextPath("/auth/sign-in"), null);
  assert.equal(getDefaultAuthenticatedPath("admin"), "/admin");
});
