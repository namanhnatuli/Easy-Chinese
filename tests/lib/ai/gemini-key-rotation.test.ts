import assert from "node:assert/strict";
import test from "node:test";

import { getNextGeminiKey, resetGeminiKeyRotation } from "@/lib/ai/gemini-key-rotation";

test.afterEach(() => {
  resetGeminiKeyRotation();
});

test("getNextGeminiKey rotates keys in round-robin order", () => {
  const config = {
    apiKeys: ["key-a", "key-b", "key-c"],
  };

  assert.deepEqual(getNextGeminiKey(config), { key: "key-a", keyIndex: 0 });
  assert.deepEqual(getNextGeminiKey(config), { key: "key-b", keyIndex: 1 });
  assert.deepEqual(getNextGeminiKey(config), { key: "key-c", keyIndex: 2 });
  assert.deepEqual(getNextGeminiKey(config), { key: "key-a", keyIndex: 0 });
});
