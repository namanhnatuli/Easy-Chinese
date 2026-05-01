import assert from "node:assert/strict";
import test from "node:test";

import {
  matchesListeningSourceType,
  normalizeListeningSourceType,
  resolveListeningSourceText,
} from "@/features/listening/helpers";

test("resolveListeningSourceText prefers canonical source text and falls back to text preview", () => {
  assert.equal(resolveListeningSourceText("  你好 世界  ", "ignored"), "你好 世界");
  assert.equal(resolveListeningSourceText(null, "你好"), "你好");
});

test("normalizeListeningSourceType falls back to custom for unknown values", () => {
  assert.equal(normalizeListeningSourceType("word"), "word");
  assert.equal(normalizeListeningSourceType("unexpected"), "custom");
});

test("matchesListeningSourceType respects all and exact matches", () => {
  assert.equal(matchesListeningSourceType("example", "all"), true);
  assert.equal(matchesListeningSourceType("example", "example"), true);
  assert.equal(matchesListeningSourceType("example", "word"), false);
});
