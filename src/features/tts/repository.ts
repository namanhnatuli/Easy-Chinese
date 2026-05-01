import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getTtsConfig } from "@/features/tts/config";
import { resolveTtsCacheRequest, type ResolvedTtsCacheRequest } from "@/features/tts/request";
import {
  ttsAudioCacheRowSchema,
  type TtsAudioCacheRow,
  type TtsResolveRequestInput,
} from "@/features/tts/schema";

export interface TtsCacheLookupResult {
  request: ResolvedTtsCacheRequest;
  cacheEntry: TtsAudioCacheRow | null;
  audioUrl: string | null;
  cacheStatus: "hit" | "miss";
}

export async function getAudioUrlForStorageObject({
  storageBucket,
  storagePath,
}: {
  storageBucket: string;
  storagePath: string;
}) {
  const config = getTtsConfig();
  const adminSupabase = createSupabaseAdminClient();

  if (config.storageAccess === "public") {
    const { data } = adminSupabase.storage.from(storageBucket).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  const { data, error } = await adminSupabase.storage
    .from(storageBucket)
    .createSignedUrl(storagePath, 60 * 10);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

async function touchTtsCacheEntry(rowId: string) {
  const adminSupabase = createSupabaseAdminClient();
  const { data: currentRow } = await adminSupabase
    .from("tts_audio_cache")
    .select("access_count")
    .eq("id", rowId)
    .maybeSingle();

  await adminSupabase
    .from("tts_audio_cache")
    .update({
      last_accessed_at: new Date().toISOString(),
      access_count: (currentRow?.access_count ?? 0) + 1,
    })
    .eq("id", rowId);
}

export async function findTtsCacheEntry(input: TtsResolveRequestInput): Promise<TtsCacheLookupResult> {
  const request = resolveTtsCacheRequest(input);
  return findTtsCacheEntryByKey(request);
}

export async function findTtsCacheEntryByKey(
  request: ResolvedTtsCacheRequest,
): Promise<TtsCacheLookupResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tts_audio_cache")
    .select(
      "id, cache_key, provider, voice, language_code, text_hash, text_preview, source_text, source_type, source_ref_id, source_metadata, storage_bucket, storage_path, mime_type, size_bytes, character_count, access_count, created_by, created_at, updated_at, last_accessed_at",
    )
    .eq("cache_key", request.cacheKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      request,
      cacheEntry: null,
      audioUrl: null,
      cacheStatus: "miss",
    };
  }

  const cacheEntry = ttsAudioCacheRowSchema.parse(data);
  const audioUrl = await getAudioUrlForStorageObject({
    storageBucket: cacheEntry.storage_bucket,
    storagePath: cacheEntry.storage_path,
  });
  await touchTtsCacheEntry(cacheEntry.id);
  logger.info("tts_cache_metadata_touched", {
    cacheKey: cacheEntry.cache_key,
    provider: cacheEntry.provider,
    accessCount: cacheEntry.access_count + 1,
  });

  return {
    request,
    cacheEntry,
    audioUrl,
    cacheStatus: "hit",
  };
}
