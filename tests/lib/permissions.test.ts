import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessAdmin,
  canAccessDashboard,
  canPersistProgress,
  hasPermission,
  isAuthenticatedRole,
} from "@/lib/permissions";

test("anonymous users are limited to public content", () => {
  assert.equal(hasPermission("anonymous", "content.read"), true);
  assert.equal(hasPermission("anonymous", "dashboard.read"), false);
  assert.equal(canPersistProgress("anonymous"), false);
  assert.equal(isAuthenticatedRole("anonymous"), false);
});

test("admins inherit user capabilities and admin access", () => {
  assert.equal(canAccessDashboard("admin"), true);
  assert.equal(canAccessAdmin("admin"), true);
  assert.equal(canPersistProgress("admin"), true);
});
