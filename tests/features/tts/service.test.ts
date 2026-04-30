import assert from "node:assert/strict";
import test from "node:test";

import { resetEnvCache } from "@/lib/env";
import { TtsServiceError } from "@/features/tts/errors";
import { AzureTtsProvider } from "@/features/tts/providers/azure";
import type { TtsProviderClient } from "@/features/tts/providers/types";
import { selectTtsProvider, validateTtsRequest } from "@/features/tts/validation";

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
  }
}

function applyBaseEnv(extra?: Record<string, string | undefined>) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test-key",
    NEXT_PUBLIC_APP_NAME: "Chinese Learning App",
    NEXT_PUBLIC_DEFAULT_LOCALE: "en",
    TTS_PROVIDER: "azure",
    TTS_DEFAULT_LANGUAGE: "zh-CN",
    TTS_DEFAULT_VOICE: "zh-CN-XiaoxiaoNeural",
    TTS_DEFAULT_SPEAKING_RATE: "0.82",
    TTS_DEFAULT_PITCH: "0",
    TTS_STORAGE_BUCKET: "tts-audio",
    TTS_STORAGE_ACCESS: "public",
    TTS_MAX_CHARACTERS_PER_REQUEST: "280",
    ...extra,
  };
}

test("validateTtsRequest accepts a supported zh-CN Azure request", () => {
  withEnv(applyBaseEnv(), () => {
    const resolved = validateTtsRequest({
      text: "你好",
      provider: "azure",
      languageCode: "zh-CN",
      voice: "zh-CN-XiaoxiaoNeural",
    });

    assert.equal(resolved.provider, "azure");
    assert.equal(resolved.languageCode, "zh-CN");
    assert.equal(resolved.voice, "zh-CN-XiaoxiaoNeural");
  });
});

test("validateTtsRequest rejects overly long text", () => {
  withEnv(applyBaseEnv({ TTS_MAX_CHARACTERS_PER_REQUEST: "2" }), () => {
    assert.throws(
      () =>
        validateTtsRequest({
          text: "你好啊",
          provider: "azure",
          languageCode: "zh-CN",
          voice: "zh-CN-XiaoxiaoNeural",
        }),
      (error: unknown) =>
        error instanceof TtsServiceError &&
        error.code === "invalid_input" &&
        error.message.includes("character TTS limit"),
    );
  });
});

test("validateTtsRequest rejects unsupported voices", () => {
  withEnv(applyBaseEnv(), () => {
    assert.throws(
      () =>
        validateTtsRequest({
          text: "你好",
          provider: "azure",
          languageCode: "zh-CN",
          voice: "invalid-voice",
        }),
      (error: unknown) =>
        error instanceof TtsServiceError &&
        error.code === "invalid_input" &&
        error.message.includes("Unsupported TTS voice"),
    );
  });
});

test("selectTtsProvider returns the requested provider implementation", () => {
  const registry = {
    azure: { provider: "azure" },
    google: { provider: "google" },
  } as Record<"azure" | "google", TtsProviderClient>;

  const provider = selectTtsProvider("google", registry);
  assert.equal(provider.provider, "google");
});

test("Azure provider returns provider_not_configured when credentials are missing", async () => {
  const provider = new AzureTtsProvider({});

  await assert.rejects(
    () =>
      provider.synthesizeSpeech({
        text: "你好",
        languageCode: "zh-CN",
        voice: "zh-CN-XiaoxiaoNeural",
        speakingRate: 0.82,
        pitch: 0,
      }),
    (error: unknown) =>
      error instanceof TtsServiceError && error.code === "provider_not_configured",
  );
});

test("Azure provider maps 429 responses to quota_or_rate_limited", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response("rate limited", { status: 429 });

  try {
    const provider = new AzureTtsProvider({
      speechKey: "x".repeat(30),
      speechRegion: "southeastasia",
    });

    await assert.rejects(
      () =>
        provider.synthesizeSpeech({
          text: "你好",
          languageCode: "zh-CN",
          voice: "zh-CN-XiaoxiaoNeural",
          speakingRate: 0.82,
          pitch: 0,
        }),
      (error: unknown) =>
        error instanceof TtsServiceError && error.code === "quota_or_rate_limited",
    );
  } finally {
    global.fetch = originalFetch;
  }
});
