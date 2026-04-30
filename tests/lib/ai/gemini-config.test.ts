import assert from "node:assert/strict";
import test from "node:test";

import { getGeminiConfig, resetGeminiConfigCache } from "@/lib/ai/gemini-config";
import { GeminiServiceError } from "@/lib/ai/gemini-types";
import { resetEnvCache } from "@/lib/env";

function withEnv(overrides: Record<string, string | undefined>, run: () => void) {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  resetEnvCache();
  resetGeminiConfigCache();

  try {
    run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    resetEnvCache();
    resetGeminiConfigCache();
  }
}

function getBaseEnv(extra?: Record<string, string | undefined>) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test-key",
    NEXT_PUBLIC_APP_NAME: "Chinese Learning App",
    NEXT_PUBLIC_DEFAULT_LOCALE: "en",
    GEMINI_API_KEYS: '["key-1","key-2"]',
    GEMINI_MODEL_WEIGHTS: '[{"model":"gemini-2.5-flash","weight":2},{"model":"gemini-2.5-flash-lite","weight":1}]',
    GEMINI_MAX_RETRIES: "3",
    GEMINI_TIMEOUT_MS: "30000",
    GEMINI_DEFAULT_TEMPERATURE: "0.4",
    GEMINI_DEFAULT_MAX_OUTPUT_TOKENS: "2048",
    ...extra,
  };
}

test("getGeminiConfig parses keys and model weights from JSON env", () => {
  withEnv(getBaseEnv(), () => {
    const config = getGeminiConfig();

    assert.deepEqual(config.apiKeys, ["key-1", "key-2"]);
    assert.deepEqual(config.modelWeights, [
      { model: "gemini-2.5-flash", weight: 2 },
      { model: "gemini-2.5-flash-lite", weight: 1 },
    ]);
    assert.equal(config.maxRetries, 3);
    assert.equal(config.timeoutMs, 30000);
  });
});

test("getGeminiConfig rejects empty Gemini key lists", () => {
  withEnv(getBaseEnv({ GEMINI_API_KEYS: "[]" }), () => {
    assert.throws(
      () => getGeminiConfig(),
      (error: unknown) =>
        error instanceof GeminiServiceError &&
        error.code === "invalid_config" &&
        error.message.includes("GEMINI_API_KEYS"),
    );
  });
});

test("getGeminiConfig rejects non-positive weights", () => {
  withEnv(getBaseEnv({ GEMINI_MODEL_WEIGHTS: '[{"model":"gemini-2.5-flash","weight":0}]' }), () => {
    assert.throws(
      () => getGeminiConfig(),
      (error: unknown) =>
        error instanceof GeminiServiceError &&
        error.code === "invalid_config" &&
        error.message.includes("weight"),
    );
  });
});
