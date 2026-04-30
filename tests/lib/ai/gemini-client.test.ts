import assert from "node:assert/strict";
import test from "node:test";

import { generateGeminiContent } from "@/lib/ai/gemini-client";
import { resetGeminiConfigCache } from "@/lib/ai/gemini-config";
import { resetGeminiKeyRotation } from "@/lib/ai/gemini-key-rotation";
import { resetGeminiModelSelection } from "@/lib/ai/gemini-model-selection";
import { GeminiServiceError } from "@/lib/ai/gemini-types";
import { resetEnvCache } from "@/lib/env";

function withEnv(overrides: Record<string, string | undefined>, run: () => Promise<void>) {
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
  resetGeminiKeyRotation();
  resetGeminiModelSelection();

  return run().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    resetEnvCache();
    resetGeminiConfigCache();
    resetGeminiKeyRotation();
    resetGeminiModelSelection();
  });
}

function getBaseEnv(extra?: Record<string, string | undefined>) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test-key",
    NEXT_PUBLIC_APP_NAME: "Chinese Learning App",
    NEXT_PUBLIC_DEFAULT_LOCALE: "en",
    GEMINI_API_KEYS: '["key-1","key-2"]',
    GEMINI_MODEL_WEIGHTS: '[{"model":"gemini-2.5-flash","weight":1},{"model":"gemini-2.5-flash-lite","weight":1}]',
    GEMINI_MAX_RETRIES: "2",
    GEMINI_TIMEOUT_MS: "30000",
    GEMINI_DEFAULT_TEMPERATURE: "0.4",
    GEMINI_DEFAULT_MAX_OUTPUT_TOKENS: "2048",
    ...extra,
  };
}

test("generateGeminiContent retries with the next key after a rate limit error", async () => {
  const originalFetch = global.fetch;
  const requestedUrls: string[] = [];

  global.fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);

    if (requestedUrls.length === 1) {
      return new Response(
        JSON.stringify({
          error: {
            code: 429,
            message: "Resource exhausted.",
            status: "RESOURCE_EXHAUSTED",
          },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: "{\"ok\":true}" }],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await withEnv(getBaseEnv(), async () => {
      const result = await generateGeminiContent({
        feature: "test_feature",
        prompt: "Say hello",
        responseMimeType: "application/json",
      });

      assert.equal(result.keyIndex, 1);
      assert.ok(["gemini-2.5-flash", "gemini-2.5-flash-lite"].includes(result.model));
      assert.equal(result.text, "{\"ok\":true}");
      assert.match(requestedUrls[0]!, /key=key-1/);
      assert.match(requestedUrls[1]!, /key=key-2/);
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("generateGeminiContent does not retry invalid input errors", async () => {
  const originalFetch = global.fetch;
  let callCount = 0;

  global.fetch = async () => {
    callCount += 1;
    return new Response(
      JSON.stringify({
        error: {
          code: 400,
          message: "Malformed request.",
          status: "INVALID_ARGUMENT",
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await withEnv(getBaseEnv(), async () => {
      await assert.rejects(
        () =>
          generateGeminiContent({
            feature: "test_feature",
            prompt: "Say hello",
          }),
        (error: unknown) =>
          error instanceof GeminiServiceError &&
          error.code === "invalid_input" &&
          callCount === 1,
      );
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("generateGeminiContent tries the next key before failing auth across all configured keys", async () => {
  const originalFetch = global.fetch;
  let callCount = 0;

  global.fetch = async () => {
    callCount += 1;
    return new Response(
      JSON.stringify({
        error: {
          code: 403,
          message: "Key is not allowed for this model.",
          status: "PERMISSION_DENIED",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await withEnv(getBaseEnv(), async () => {
      await assert.rejects(
        () =>
          generateGeminiContent({
            feature: "test_feature",
            prompt: "Say hello",
          }),
        (error: unknown) =>
          error instanceof GeminiServiceError &&
          error.code === "auth_error" &&
          callCount === 2,
      );
    });
  } finally {
    global.fetch = originalFetch;
  }
});
