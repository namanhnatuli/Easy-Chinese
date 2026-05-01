import "server-only";

import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { buildTtsTextPreview } from "@/features/tts/cache-key";
import { createTtsServiceError } from "@/features/tts/errors";
import { createTtsProviderRegistry } from "@/features/tts/providers";
import type { TtsSynthesisResult } from "@/features/tts/providers/types";
import {
  findTtsCacheEntry,
  findTtsCacheEntryByKey,
  getAudioUrlForStorageObject,
  type TtsCacheLookupResult,
} from "@/features/tts/repository";
import { type TtsProvider, type TtsResolveRequestInput } from "@/features/tts/schema";
import { selectTtsProvider, validateTtsRequest } from "@/features/tts/validation";

export type ResolvedTtsAudioResult = Omit<TtsCacheLookupResult, "cacheStatus" | "audioUrl"> & {
  cacheStatus: "hit" | "generated";
  audioUrl: string;
};

async function recoverExistingCacheEntry(params: {
  cacheKey: string;
  request: ResolvedTtsAudioResult["request"];
}) {
  const existing = await findTtsCacheEntryByKey(params.request);

  if (!existing.cacheEntry || !existing.audioUrl) {
    throw createTtsServiceError(
      "provider_failed",
      `TTS cache conflict occurred for ${params.cacheKey}, but no existing cache entry could be loaded.`,
    );
  }

  return existing;
}

async function writeTtsCacheObject(params: {
  request: ResolvedTtsAudioResult["request"];
  cacheKey: string;
  provider: "azure" | "google";
  voice: string;
  languageCode: string;
  text: string;
  sourceText: string;
  sourceType: "word" | "example" | "article" | "custom";
  sourceRefId: string | null;
  sourceMetadata: Record<string, unknown> | null;
  textHash: string;
  textPreview: string;
  characterCount: number;
  storageBucket: string;
  storagePath: string;
  audioBuffer: Buffer;
  mimeType: string;
}) {
  const adminSupabase = createSupabaseAdminClient();
  const { error: uploadError } = await adminSupabase.storage
    .from(params.storageBucket)
    .upload(params.storagePath, params.audioBuffer, {
      contentType: params.mimeType,
      upsert: false,
    });

  if (uploadError && !uploadError.message.toLowerCase().includes("already exists")) {
    throw createTtsServiceError(
      "provider_failed",
      `Failed to upload generated TTS audio to storage: ${uploadError.message}`,
    );
  }

  const { data, error } = await adminSupabase
    .from("tts_audio_cache")
    .insert({
      cache_key: params.cacheKey,
      provider: params.provider,
      voice: params.voice,
      language_code: params.languageCode,
      text_hash: params.textHash,
      text_preview: buildTtsTextPreview(params.textPreview),
      source_text: params.sourceText,
      source_type: params.sourceType,
      source_ref_id: params.sourceRefId,
      source_metadata: params.sourceMetadata,
      storage_bucket: params.storageBucket,
      storage_path: params.storagePath,
      mime_type: params.mimeType,
      size_bytes: params.audioBuffer.byteLength,
      character_count: params.characterCount,
      access_count: 0,
      last_accessed_at: new Date().toISOString(),
    })
    .select(
      "id, cache_key, provider, voice, language_code, text_hash, text_preview, source_text, source_type, source_ref_id, source_metadata, storage_bucket, storage_path, mime_type, size_bytes, character_count, access_count, created_by, created_at, updated_at, last_accessed_at",
    )
    .single();

  if (error && error.code === "23505") {
    logger.warn("tts_cache_insert_conflict", {
      cacheKey: params.cacheKey,
      storagePath: params.storagePath,
    });

    const existing = await recoverExistingCacheEntry({
      cacheKey: params.cacheKey,
      request: params.request,
    });

    return existing.cacheEntry;
  }

  if (error) {
    throw createTtsServiceError(
      "provider_failed",
      `Failed to persist TTS cache metadata: ${error.message}`,
    );
  }

  return data;
}

export async function resolveTtsAudio(
  input: TtsResolveRequestInput,
  preferences?: {
    provider?: TtsProvider | null;
    voice?: string | null;
  },
): Promise<ResolvedTtsAudioResult> {
  const request = validateTtsRequest(input, preferences);
  logger.info("tts_request_received", {
    provider: request.provider,
    languageCode: request.languageCode,
    voice: request.voice,
    characterCount: request.characterCount,
    cacheKey: request.cacheKey,
  });

  const cacheLookup = await findTtsCacheEntry(request);

  if (cacheLookup.cacheEntry && cacheLookup.audioUrl) {
    logger.info("tts_cache_hit", {
      provider: request.provider,
      cacheKey: request.cacheKey,
      characterCount: request.characterCount,
    });

    return {
      ...cacheLookup,
      cacheStatus: "hit",
      audioUrl: cacheLookup.audioUrl,
    };
  }

  logger.info("tts_cache_miss", {
    provider: request.provider,
    cacheKey: request.cacheKey,
    characterCount: request.characterCount,
  });

  const providerRegistry = createTtsProviderRegistry();
  const provider = selectTtsProvider(request.provider, providerRegistry);
  let synthesis: TtsSynthesisResult;
  try {
    synthesis = await provider.synthesizeSpeech({
      text: request.text,
      languageCode: request.languageCode,
      voice: request.voice,
      speakingRate: request.speakingRate,
      pitch: request.pitch,
    });
  } catch (error) {
    logger.error("tts_provider_failed", error, {
      provider: request.provider,
      cacheKey: request.cacheKey,
      characterCount: request.characterCount,
    });
    throw error;
  }

  const cacheEntry = await writeTtsCacheObject({
    request,
    cacheKey: request.cacheKey,
    provider: request.provider,
    voice: request.voice,
    languageCode: request.languageCode,
    text: request.text,
    sourceText: request.sourceText,
    sourceType: request.sourceType,
    sourceRefId: request.sourceRefId,
    sourceMetadata: request.sourceMetadata,
    textHash: request.textHash,
    textPreview: request.textPreview,
    characterCount: request.characterCount,
    storageBucket: request.storageBucket,
    storagePath: request.storagePath,
    audioBuffer: synthesis.audioBuffer,
    mimeType: synthesis.mimeType,
  });

  const audioUrl = await getAudioUrlForStorageObject({
    storageBucket: request.storageBucket,
    storagePath: request.storagePath,
  });

  logger.info("tts_cache_generated", {
    provider: request.provider,
    cacheKey: request.cacheKey,
    characterCount: request.characterCount,
    sizeBytes: synthesis.audioBuffer.byteLength,
  });

  return {
    request,
    cacheEntry,
    audioUrl,
    cacheStatus: "generated",
  };
}
