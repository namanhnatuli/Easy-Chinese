import "server-only";

import { getServerEnv } from "@/lib/env";
import { getSupportedTtsLanguageCodes } from "@/features/tts/catalog";
import { ttsStorageAccessSchema, type TtsProvider, type TtsStorageAccess } from "@/features/tts/schema";

export const DEFAULT_TTS_MAX_CHARACTERS_PER_REQUEST = 280;

export interface TtsConfig {
  speakingRate: number;
  pitch: number;
  bucketName: string;
  storageAccess: TtsStorageAccess;
  maxCharactersPerRequest: number;
  allowedLanguageCodes: string[];
  configuredProviders: TtsProvider[];
  anonymousRequestLimitPerMinute: number | null;
}

function parseOptionalCsv(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parts = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : null;
}

export function getConfiguredTtsProviders() {
  const env = getServerEnv();
  const providers: TtsProvider[] = [];

  if (env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION) {
    providers.push("azure");
  }

  if (env.GOOGLE_TTS_API_KEY) {
    providers.push("google");
  }

  return providers;
}

export function resolveConfiguredTtsProvider(preferredProvider?: TtsProvider | null) {
  const configuredProviders = getConfiguredTtsProviders();

  if (preferredProvider && configuredProviders.includes(preferredProvider)) {
    return preferredProvider;
  }

  if (configuredProviders.length > 0) {
    return configuredProviders[0];
  }

  return preferredProvider ?? "azure";
}

export function getTtsConfig(): TtsConfig {
  const env = getServerEnv();
  const allowedLanguageCodes = parseOptionalCsv(env.TTS_ALLOWED_LANGUAGE_CODES) ?? getSupportedTtsLanguageCodes();

  return {
    speakingRate: env.TTS_DEFAULT_SPEAKING_RATE ?? 0.82,
    pitch: env.TTS_DEFAULT_PITCH ?? 0,
    bucketName: env.TTS_STORAGE_BUCKET ?? "tts-audio",
    storageAccess: ttsStorageAccessSchema.parse(env.TTS_STORAGE_ACCESS ?? "public"),
    maxCharactersPerRequest:
      env.TTS_MAX_CHARACTERS_PER_REQUEST ?? DEFAULT_TTS_MAX_CHARACTERS_PER_REQUEST,
    allowedLanguageCodes,
    configuredProviders: getConfiguredTtsProviders(),
    anonymousRequestLimitPerMinute: env.TTS_ANONYMOUS_REQUEST_LIMIT_PER_MINUTE ?? null,
  };
}
