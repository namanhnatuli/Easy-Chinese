import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateListeningDictationAnswer,
  normalizeListeningAnswer,
} from "@/features/listening/evaluation";

test("normalizeListeningAnswer removes spaces and punctuation", () => {
  assert.equal(normalizeListeningAnswer("  你好， 世界！ "), "你好世界");
});

test("evaluateListeningDictationAnswer returns correct for exact normalized matches", () => {
  const result = evaluateListeningDictationAnswer({
    expected: "你好，世界！",
    answer: "你好世界",
  });

  assert.equal(result.result, "correct");
  assert.equal(result.score, 1);
});

test("evaluateListeningDictationAnswer returns almost for close matches", () => {
  const result = evaluateListeningDictationAnswer({
    expected: "我们一起学习中文",
    answer: "我们一起学中文",
  });

  assert.equal(result.result, "almost");
  assert.ok(result.score >= 0.8);
});

test("evaluateListeningDictationAnswer downgrades exact matches when a hint was used", () => {
  const result = evaluateListeningDictationAnswer({
    expected: "今天下雨了",
    answer: "今天下雨了",
    hintUsed: true,
  });

  assert.equal(result.result, "almost");
  assert.equal(result.score, 1);
});
