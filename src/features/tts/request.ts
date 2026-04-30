import {
  buildTtsCacheKey,
  buildTtsStoragePath,
  buildTtsTextPreview,
} from "@/features/tts/cache-key";
import { getTtsConfig } from "@/features/tts/config";
import { ttsResolveRequestSchema, type TtsResolveRequestInput } from "@/features/tts/schema";

export interface ResolvedTtsCacheRequest {
  text: string;
  provider: "azure" | "google";
  languageCode: string;
  voice: string;
  speakingRate: number;
  pitch: number;
  cacheKey: string;
  textHash: string;
  textPreview: string;
  characterCount: number;
  storageBucket: string;
  storagePath: string;
}

export function resolveTtsCacheRequest(input: TtsResolveRequestInput): ResolvedTtsCacheRequest {
  const parsed = ttsResolveRequestSchema.parse(input);
  const config = getTtsConfig();
  const provider = parsed.provider ?? config.provider;
  const languageCode = parsed.languageCode ?? config.defaultLanguage;
  const voice = parsed.voice ?? config.defaultVoice;
  const speakingRate = parsed.speakingRate ?? config.speakingRate;
  const pitch = parsed.pitch ?? config.pitch;

  const cacheKeyData = buildTtsCacheKey({
    provider,
    languageCode,
    voice,
    speakingRate,
    pitch,
    text: parsed.text,
  });

  return {
    text: cacheKeyData.normalizedText,
    provider,
    languageCode,
    voice,
    speakingRate,
    pitch,
    cacheKey: cacheKeyData.cacheKey,
    textHash: cacheKeyData.textHash,
    textPreview: buildTtsTextPreview(cacheKeyData.normalizedText),
    characterCount: Array.from(cacheKeyData.normalizedText).length,
    storageBucket: config.bucketName,
    storagePath: buildTtsStoragePath({
      languageCode,
      voice,
      cacheKey: cacheKeyData.cacheKey,
    }),
  };
}
