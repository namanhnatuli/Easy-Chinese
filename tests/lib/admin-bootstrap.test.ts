import assert from "node:assert/strict";
import test from "node:test";

import { getAdminEmailsAllowlist, isAdminEmailAllowlisted, resolveBootstrapRole } from "@/lib/admin-bootstrap";
import { resetEnvCache } from "@/lib/env";

test.afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  resetEnvCache();
});

test("admin allowlist normalizes case and whitespace", () => {
  process.env.ADMIN_EMAILS = " Admin@example.com , second@example.com ";
  resetEnvCache();

  assert.deepEqual(getAdminEmailsAllowlist(), ["admin@example.com", "second@example.com"]);
  assert.equal(isAdminEmailAllowlisted("ADMIN@example.com"), true);
});

test("bootstrap role preserves existing admin when allowlist is removed", () => {
  process.env.ADMIN_EMAILS = "";
  resetEnvCache();

  assert.equal(resolveBootstrapRole("admin@example.com", "admin"), "admin");
  assert.equal(resolveBootstrapRole("user@example.com", "user"), "user");
});
