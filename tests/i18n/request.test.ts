import assert from "node:assert/strict";
import test from "node:test";

import { resolveRequestLocale } from "@/i18n/locale";
import { localizeHref, replaceLocaleInPathname, stripLocaleFromPathname } from "@/i18n/navigation";

test("resolveRequestLocale prefers pathname locale over profile and cookie", () => {
  assert.equal(
    resolveRequestLocale({
      pathnameLocale: "zh",
      profileLocale: "vi",
      cookieLocale: "en",
    }),
    "zh",
  );
});

test("resolveRequestLocale falls back to profile, then cookie, then default", () => {
  assert.equal(
    resolveRequestLocale({
      pathnameLocale: null,
      profileLocale: "vi",
      cookieLocale: "en",
    }),
    "vi",
  );
  assert.equal(
    resolveRequestLocale({
      pathnameLocale: null,
      profileLocale: null,
      cookieLocale: "zh",
    }),
    "zh",
  );
  assert.equal(
    resolveRequestLocale({
      pathnameLocale: null,
      profileLocale: null,
      cookieLocale: null,
    }),
    "en",
  );
});

test("localizeHref prefixes internal routes and preserves query/hash", () => {
  assert.equal(localizeHref("/dashboard", "vi"), "/vi/dashboard");
  assert.equal(localizeHref("/en/review?mode=typing#top", "zh"), "/zh/review?mode=typing#top");
  assert.equal(localizeHref("https://example.com", "zh"), "https://example.com");
});

test("stripLocaleFromPathname removes only supported locale prefixes", () => {
  assert.equal(stripLocaleFromPathname("/zh/settings"), "/settings");
  assert.equal(stripLocaleFromPathname("/vi"), "/");
  assert.equal(stripLocaleFromPathname("/dashboard"), "/dashboard");
});

test("replaceLocaleInPathname preserves the current route while switching locale", () => {
  assert.equal(replaceLocaleInPathname("/dashboard", "vi"), "/vi/dashboard");
  assert.equal(replaceLocaleInPathname("/en/review", "zh"), "/zh/review");
  assert.equal(replaceLocaleInPathname("/", "zh"), "/zh");
});
