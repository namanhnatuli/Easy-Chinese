import assert from "node:assert/strict";
import test from "node:test";

import { comparePronunciation } from "@/features/practice/pronunciation";

test("comparePronunciation normalizes whitespace and punctuation", () => {
  const result = comparePronunciation({
    expected: "你 好！",
    transcript: "你好",
  });

  assert.equal(result.isCorrect, true);
  assert.equal(result.matchRatio, 1);
  assert.equal(result.normalizedExpected, "你好");
  assert.equal(result.normalizedTranscript, "你好");
});

test("comparePronunciation flags mismatched characters", () => {
  const result = comparePronunciation({
    expected: "学习中文",
    transcript: "学习中午",
  });

  assert.equal(result.isCorrect, false);
  assert.equal(result.segments[0]?.expected, true);
  assert.equal(result.segments[1]?.expected, true);
  assert.equal(result.segments[2]?.expected, true);
  assert.equal(result.segments[3]?.expected, false);
});
