import { z } from "zod";

export const ttsProviderSchema = z.enum(["azure", "google"]);
export type TtsProvider = z.infer<typeof ttsProviderSchema>;

export const ttsStorageAccessSchema = z.enum(["public", "private"]);
export type TtsStorageAccess = z.infer<typeof ttsStorageAccessSchema>;

export const ttsResolveRequestSchema = z.object({
  text: z.string().trim().min(1).max(1_000),
  languageCode: z.string().trim().min(2).max(32).optional(),
  voice: z.string().trim().min(1).max(120).optional(),
  provider: ttsProviderSchema.optional(),
  speakingRate: z.number().min(0.25).max(4).optional(),
  pitch: z.number().min(-20).max(20).optional(),
  scope: z.enum(["vocabulary", "lesson", "practice"]).optional(),
});

export type TtsResolveRequestInput = z.input<typeof ttsResolveRequestSchema>;
export type TtsResolveRequest = z.infer<typeof ttsResolveRequestSchema>;

export const ttsAudioCacheRowSchema = z.object({
  id: z.string().uuid(),
  cache_key: z.string().min(1),
  provider: ttsProviderSchema,
  voice: z.string().min(1),
  language_code: z.string().min(2),
  text_hash: z.string().length(64),
  text_preview: z.string().min(1),
  storage_bucket: z.string().min(1),
  storage_path: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: z.coerce.number().nonnegative(),
  character_count: z.coerce.number().nonnegative(),
  access_count: z.coerce.number().int().nonnegative().default(0),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  last_accessed_at: z.string().nullable(),
});

export type TtsAudioCacheRow = z.infer<typeof ttsAudioCacheRowSchema>;
