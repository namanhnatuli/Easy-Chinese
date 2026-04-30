import "server-only";

import { getServerEnv } from "@/lib/env";
import {
  ttsProviderSchema,
  ttsStorageAccessSchema,
  type TtsProvider,
  type TtsStorageAccess,
} from "@/features/tts/schema";

const PROVIDER_DEFAULTS = {
  azure: {
    defaultLanguage: "zh-CN",
    defaultVoice: "zh-CN-XiaoxiaoNeural",
    supportedVoices: ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"] as const,
  },
  google: {
    defaultLanguage: "zh-CN",
    defaultVoice: "cmn-CN-Standard-A",
    supportedVoices: ["cmn-CN-Standard-A", "cmn-CN-Standard-B", "cmn-CN-Wavenet-A"] as const,
  },
} satisfies Record<
  TtsProvider,
  {
    defaultLanguage: string;
    defaultVoice: string;
    supportedVoices: readonly string[];
  }
>;

const SUPPORTED_LANGUAGE_CODES = ["zh-CN"] as const;

export const DEFAULT_TTS_MAX_CHARACTERS_PER_REQUEST = 280;

export interface TtsProviderDefaults {
  defaultLanguage: string;
  defaultVoice: string;
  supportedVoices: readonly string[];
}

export function getTtsProviderDefaults(provider: TtsProvider): TtsProviderDefaults {
  return PROVIDER_DEFAULTS[provider];
}

export function isSupportedTtsLanguageCode(languageCode: string) {
  return SUPPORTED_LANGUAGE_CODES.includes(languageCode as (typeof SUPPORTED_LANGUAGE_CODES)[number]);
}

export function isSupportedTtsVoice(provider: TtsProvider, voice: string) {
  return (PROVIDER_DEFAULTS[provider].supportedVoices as readonly string[]).includes(voice);
}

export function getSupportedTtsLanguageCodes() {
  return [...SUPPORTED_LANGUAGE_CODES];
}

export interface TtsConfig {
  provider: TtsProvider;
  defaultLanguage: string;
  defaultVoice: string;
  speakingRate: number;
  pitch: number;
  bucketName: string;
  storageAccess: TtsStorageAccess;
  maxCharactersPerRequest: number;
  allowedLanguageCodes: string[];
  allowedVoices: Record<TtsProvider, string[]>;
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

export function getTtsConfig(): TtsConfig {
  const env = getServerEnv();
  const provider = ttsProviderSchema.parse(env.TTS_PROVIDER ?? "azure");
  const defaults = getTtsProviderDefaults(provider);
  const allowedLanguageCodes = parseOptionalCsv(env.TTS_ALLOWED_LANGUAGE_CODES) ?? getSupportedTtsLanguageCodes();
  const allowedVoices = {
    azure: parseOptionalCsv(env.TTS_ALLOWED_AZURE_VOICES) ?? [...getTtsProviderDefaults("azure").supportedVoices],
    google: parseOptionalCsv(env.TTS_ALLOWED_GOOGLE_VOICES) ?? [...getTtsProviderDefaults("google").supportedVoices],
  } satisfies Record<TtsProvider, string[]>;

  return {
    provider,
    defaultLanguage: env.TTS_DEFAULT_LANGUAGE ?? defaults.defaultLanguage,
    defaultVoice: (env.TTS_DEFAULT_VOICE && isSupportedTtsVoice(provider, env.TTS_DEFAULT_VOICE))
      ? env.TTS_DEFAULT_VOICE.trim()
      : defaults.defaultVoice,
    speakingRate: env.TTS_DEFAULT_SPEAKING_RATE ?? 0.82,
    pitch: env.TTS_DEFAULT_PITCH ?? 0,
    bucketName: env.TTS_STORAGE_BUCKET ?? "tts-audio",
    storageAccess: ttsStorageAccessSchema.parse(env.TTS_STORAGE_ACCESS ?? "public"),
    maxCharactersPerRequest:
      env.TTS_MAX_CHARACTERS_PER_REQUEST ?? DEFAULT_TTS_MAX_CHARACTERS_PER_REQUEST,
    allowedLanguageCodes,
    allowedVoices,
    anonymousRequestLimitPerMinute: env.TTS_ANONYMOUS_REQUEST_LIMIT_PER_MINUTE ?? null,
  };
}
