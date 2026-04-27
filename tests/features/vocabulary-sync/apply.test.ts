import test from "node:test";
import assert from "node:assert/strict";

import { resolveEffectiveInputTextForApply } from "@/features/vocabulary-sync/apply-payload";

test("resolveEffectiveInputTextForApply falls back to normalizedText when inputText is missing", () => {
  assert.equal(
    resolveEffectiveInputTextForApply({
      inputText: null,
      normalizedText: "你好",
    }),
    "你好",
  );
});

test("resolveEffectiveInputTextForApply prefers inputText when provided", () => {
  assert.equal(
    resolveEffectiveInputTextForApply({
      inputText: "妳好",
      normalizedText: "你好",
    }),
    "妳好",
  );
});
