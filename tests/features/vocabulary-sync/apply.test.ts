import assert from "node:assert/strict";
import test from "node:test";

import { buildWordSlugBase } from "@/features/vocabulary-sync/apply-slug";

test("buildWordSlugBase prefers ASCII-safe pinyin slugs", () => {
  const slug = buildWordSlugBase({
    normalizedText: "打电话",
    pinyin: "dǎ diànhuà",
  });

  assert.equal(slug, "da-dianhua");
});

test("buildWordSlugBase falls back to normalized text codepoints when needed", () => {
  const slug = buildWordSlugBase({
    normalizedText: "你",
    pinyin: null,
  });

  assert.equal(slug, "word-4f60");
});
