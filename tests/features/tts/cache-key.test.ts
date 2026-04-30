import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTtsCacheKey,
  buildTtsStoragePath,
  normalizeTtsText,
} from "@/features/tts/cache-key";

test("normalizeTtsText trims, normalizes unicode, and collapses whitespace", () => {
  assert.equal(normalizeTtsText("  你　好   吗  "), "你 好 吗");
});

test("buildTtsCacheKey is deterministic for equivalent normalized text", () => {
  const first = buildTtsCacheKey({
    provider: "azure",
    languageCode: "zh-CN",
    voice: "zh-CN-XiaoxiaoNeural",
    speakingRate: 0.82,
    pitch: 0,
    text: "你 好",
  });

  const second = buildTtsCacheKey({
    provider: "azure",
    languageCode: "zh-CN",
    voice: "zh-CN-XiaoxiaoNeural",
    speakingRate: 0.82,
    pitch: 0,
    text: "  你   好  ",
  });

  assert.equal(first.cacheKey, second.cacheKey);
  assert.equal(first.textHash, second.textHash);
});

test("buildTtsStoragePath uses the deterministic tts/language/voice/cache path", () => {
  const path = buildTtsStoragePath({
    languageCode: "zh-CN",
    voice: "zh-CN-XiaoxiaoNeural",
    cacheKey: "abcdef1234567890",
  });

  assert.equal(path, "tts/zh-cn/zh-cn-xiaoxiaoneural/abcdef1234567890.mp3");
});
