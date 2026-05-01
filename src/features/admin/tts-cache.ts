"use server";

import { z } from "zod";

import { requireAdminSupabase, redirectTo, revalidateAdminPaths } from "@/features/admin/shared";
import { resolveTtsAudio } from "@/features/tts/service";
import { logger } from "@/lib/logger";

const DEFAULT_UNUSED_DAYS = 30;
const DEFAULT_UNUSED_LIMIT = 25;
const MAX_PREGENERATION_ITEMS = 100;
const MAX_BACKFILL_ROWS = 500;

const preGenerateFormSchema = z.object({
  lessonId: z.string().uuid().optional(),
  wordEntries: z.array(z.string().min(1)).max(MAX_PREGENERATION_ITEMS),
  exampleEntries: z.array(z.string().min(1)).max(MAX_PREGENERATION_ITEMS),
});

const ttsCacheFilterSchema = z.object({
  staleDays: z.number().int().positive().optional(),
  staleLimit: z.number().int().positive().optional(),
  sourceType: z.enum(["all", "word", "example", "article", "custom"]).default("all"),
  languageCode: z.string().trim().max(32).optional(),
  minCharacters: z.number().int().nonnegative().optional(),
  maxCharacters: z.number().int().positive().optional(),
  missingSourceTextOnly: z.boolean().optional(),
});

type TtsCacheSeedTarget = {
  text: string;
  sourceType: "word" | "example" | "article" | "custom";
  sourceRefId: string | null;
  sourceMetadata: Record<string, unknown> | null;
};

export interface TtsCacheAdminOverview {
  totalCachedFiles: number;
  totalCharactersGenerated: number;
  totalStorageBytes: number;
  estimatedTotalHits: number;
  estimatedTotalMisses: number;
  providers: Array<{
    provider: "azure" | "google";
    files: number;
    characters: number;
    storageBytes: number;
    hits: number;
  }>;
  voices: Array<{
    provider: "azure" | "google";
    voice: string;
    files: number;
    characters: number;
    storageBytes: number;
    hits: number;
  }>;
  recentEntries: Array<{
    id: string;
    cacheKey: string;
    provider: "azure" | "google";
    voice: string;
    languageCode: string;
    textPreview: string;
    sourceText: string | null;
    sourceType: "word" | "example" | "article" | "custom" | null;
    sourceRefId: string | null;
    sizeBytes: number;
    characterCount: number;
    accessCount: number;
    createdAt: string;
    lastAccessedAt: string | null;
  }>;
  staleEntries: Array<{
    id: string;
    cacheKey: string;
    provider: "azure" | "google";
    voice: string;
    textPreview: string;
    sourceText: string | null;
    sourceType: "word" | "example" | "article" | "custom" | null;
    sizeBytes: number;
    accessCount: number;
    createdAt: string;
    lastAccessedAt: string | null;
  }>;
  activeFilters: {
    sourceType: "all" | "word" | "example" | "article" | "custom";
    languageCode: string;
    minCharacters: number | null;
    maxCharacters: number | null;
    missingSourceTextOnly: boolean;
  };
  backfillCandidateCount: number;
  staleDays: number;
  lessonOptions: Array<{
    id: string;
    title: string;
    slug: string;
    isPublished: boolean;
  }>;
}

function parseMultilineInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildWordLookupSets(entries: string[]) {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const hanzi = new Set<string>();

  for (const entry of entries) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry)) {
      ids.add(entry);
      continue;
    }

    if (/^[a-z0-9-]+$/i.test(entry)) {
      slugs.add(entry);
      continue;
    }

    hanzi.add(entry);
  }

  return {
    ids: [...ids],
    slugs: [...slugs],
    hanzi: [...hanzi],
  };
}

function buildExampleLookupSets(entries: string[]) {
  const ids = new Set<string>();
  const chineseTexts = new Set<string>();

  for (const entry of entries) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry)) {
      ids.add(entry);
      continue;
    }

    chineseTexts.add(entry);
  }

  return {
    ids: [...ids],
    chineseTexts: [...chineseTexts],
  };
}


export async function getTtsCacheAdminOverview(params?: {
  staleDays?: number;
  staleLimit?: number;
  sourceType?: "all" | "word" | "example" | "article" | "custom";
  languageCode?: string;
  minCharacters?: number;
  maxCharacters?: number;
  missingSourceTextOnly?: boolean;
}): Promise<TtsCacheAdminOverview> {
  const parsedFilters = ttsCacheFilterSchema.parse({
    staleDays: params?.staleDays,
    staleLimit: params?.staleLimit,
    sourceType: params?.sourceType,
    languageCode: params?.languageCode,
    minCharacters: params?.minCharacters,
    maxCharacters: params?.maxCharacters,
    missingSourceTextOnly: params?.missingSourceTextOnly,
  });
  const staleDays = Math.max(1, parsedFilters.staleDays ?? DEFAULT_UNUSED_DAYS);
  const staleLimit = Math.max(1, Math.min(parsedFilters.staleLimit ?? DEFAULT_UNUSED_LIMIT, 100));
  const { supabase } = await requireAdminSupabase();
  let cacheQuery = supabase
    .from("tts_audio_cache")
    .select(
      "id, cache_key, provider, voice, language_code, text_preview, source_text, source_type, source_ref_id, size_bytes, character_count, access_count, created_at, last_accessed_at",
    )
    .order("created_at", { ascending: false });

  if (parsedFilters.sourceType !== "all") {
    cacheQuery = cacheQuery.eq("source_type", parsedFilters.sourceType);
  }

  if (parsedFilters.languageCode) {
    cacheQuery = cacheQuery.eq("language_code", parsedFilters.languageCode);
  }

  if (typeof parsedFilters.minCharacters === "number") {
    cacheQuery = cacheQuery.gte("character_count", parsedFilters.minCharacters);
  }

  if (typeof parsedFilters.maxCharacters === "number") {
    cacheQuery = cacheQuery.lte("character_count", parsedFilters.maxCharacters);
  }

  if (parsedFilters.missingSourceTextOnly) {
    cacheQuery = cacheQuery.is("source_text", null);
  }

  const [{ data: cacheRows, error: cacheError }, { data: lessons, error: lessonsError }, { count: backfillCandidateCount, error: backfillCountError }] = await Promise.all([
    cacheQuery,
    supabase
      .from("lessons")
      .select("id, title, slug, is_published")
      .order("is_published", { ascending: false })
      .order("sort_order")
      .order("title"),
    supabase
      .from("tts_audio_cache")
      .select("*", { count: "exact", head: true })
      .is("source_text", null),
  ]);

  if (cacheError) {
    throw cacheError;
  }

  if (lessonsError) {
    throw lessonsError;
  }

  if (backfillCountError) {
    throw backfillCountError;
  }

  const rows = cacheRows ?? [];
  const providerMap = new Map<"azure" | "google", TtsCacheAdminOverview["providers"][number]>();
  const voiceMap = new Map<string, TtsCacheAdminOverview["voices"][number]>();
  const staleThreshold = Date.now() - staleDays * 24 * 60 * 60 * 1000;

  let totalCharactersGenerated = 0;
  let totalStorageBytes = 0;
  let estimatedTotalHits = 0;

  for (const row of rows) {
    totalCharactersGenerated += row.character_count ?? 0;
    totalStorageBytes += Number(row.size_bytes ?? 0);
    estimatedTotalHits += row.access_count ?? 0;

    const providerKey = row.provider as "azure" | "google";
    const providerEntry = providerMap.get(providerKey) ?? {
      provider: providerKey,
      files: 0,
      characters: 0,
      storageBytes: 0,
      hits: 0,
    };
    providerEntry.files += 1;
    providerEntry.characters += row.character_count ?? 0;
    providerEntry.storageBytes += Number(row.size_bytes ?? 0);
    providerEntry.hits += row.access_count ?? 0;
    providerMap.set(providerKey, providerEntry);

    const voiceKey = `${row.provider}:${row.voice}`;
    const voiceEntry = voiceMap.get(voiceKey) ?? {
      provider: providerKey,
      voice: row.voice,
      files: 0,
      characters: 0,
      storageBytes: 0,
      hits: 0,
    };
    voiceEntry.files += 1;
    voiceEntry.characters += row.character_count ?? 0;
    voiceEntry.storageBytes += Number(row.size_bytes ?? 0);
    voiceEntry.hits += row.access_count ?? 0;
    voiceMap.set(voiceKey, voiceEntry);
  }

  const staleEntries = rows
    .filter((row) => {
      const referenceTime = row.last_accessed_at ? new Date(row.last_accessed_at).getTime() : new Date(row.created_at).getTime();
      return referenceTime <= staleThreshold;
    })
    .sort((left, right) => {
      const leftTime = left.last_accessed_at ? new Date(left.last_accessed_at).getTime() : new Date(left.created_at).getTime();
      const rightTime = right.last_accessed_at ? new Date(right.last_accessed_at).getTime() : new Date(right.created_at).getTime();
      return leftTime - rightTime;
    })
    .slice(0, staleLimit)
    .map((row) => ({
      id: row.id,
      cacheKey: row.cache_key,
      provider: row.provider as "azure" | "google",
      voice: row.voice,
      textPreview: row.text_preview,
      sourceText: row.source_text,
      sourceType: (row.source_type as "word" | "example" | "article" | "custom" | null) ?? null,
      sourceRefId: row.source_ref_id ?? null,
      sizeBytes: Number(row.size_bytes ?? 0),
      accessCount: row.access_count ?? 0,
      createdAt: row.created_at,
      lastAccessedAt: row.last_accessed_at,
    }));

  return {
    totalCachedFiles: rows.length,
    totalCharactersGenerated,
    totalStorageBytes,
    estimatedTotalHits,
    estimatedTotalMisses: rows.length,
    providers: [...providerMap.values()].sort((left, right) => right.files - left.files),
    voices: [...voiceMap.values()].sort((left, right) => right.files - left.files).slice(0, 10),
    recentEntries: [...rows]
      .sort((left, right) => {
        const leftTime = left.last_accessed_at ? new Date(left.last_accessed_at).getTime() : new Date(left.created_at).getTime();
        const rightTime = right.last_accessed_at ? new Date(right.last_accessed_at).getTime() : new Date(right.created_at).getTime();
        return rightTime - leftTime;
      })
      .slice(0, 10)
      .map((row) => ({
        id: row.id,
        cacheKey: row.cache_key,
        provider: row.provider as "azure" | "google",
        voice: row.voice,
        languageCode: row.language_code,
        textPreview: row.text_preview,
        sourceText: row.source_text,
        sourceType: (row.source_type as "word" | "example" | "article" | "custom" | null) ?? null,
        sourceRefId: row.source_ref_id ?? null,
        sizeBytes: Number(row.size_bytes ?? 0),
        characterCount: row.character_count ?? 0,
        accessCount: row.access_count ?? 0,
        createdAt: row.created_at,
        lastAccessedAt: row.last_accessed_at,
      })),
    staleEntries,
    activeFilters: {
      sourceType: parsedFilters.sourceType,
      languageCode: parsedFilters.languageCode ?? "",
      minCharacters: parsedFilters.minCharacters ?? null,
      maxCharacters: parsedFilters.maxCharacters ?? null,
      missingSourceTextOnly: parsedFilters.missingSourceTextOnly ?? false,
    },
    backfillCandidateCount: backfillCandidateCount ?? 0,
    staleDays,
    lessonOptions: (lessons ?? []).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      isPublished: lesson.is_published,
    })),
  };
}

async function collectLessonTexts(lessonId: string) {
  const { supabase } = await requireAdminSupabase();
  const [{ data: lesson, error: lessonError }, { data: lessonWords, error: lessonWordsError }] = await Promise.all([
    supabase.from("lessons").select("id, title").eq("id", lessonId).maybeSingle(),
    supabase
      .from("lesson_words")
      .select("sort_order, words!inner(id, slug, simplified, pinyin, vietnamese_meaning, word_examples(id, chinese_text, pinyin, vietnamese_meaning, sort_order))")
      .eq("lesson_id", lessonId)
      .order("sort_order"),
  ]);

  if (lessonError) {
    throw lessonError;
  }

  if (lessonWordsError) {
    throw lessonWordsError;
  }

  if (!lesson) {
    throw new Error("lesson_not_found");
  }

  const targets = new Map<string, TtsCacheSeedTarget>();

  for (const row of lessonWords ?? []) {
    const word = Array.isArray(row.words) ? row.words[0] : row.words;
    if (!word) {
      continue;
    }

    if (word.simplified?.trim()) {
      const text = word.simplified.trim();
      targets.set(`word:${word.id}:${text}`, {
        text,
        sourceType: "word",
        sourceRefId: word.id,
        sourceMetadata: {
          lessonId: lesson.id,
          slug: word.slug,
          pinyin: word.pinyin,
          vietnameseMeaning: word.vietnamese_meaning,
        },
      });
    }

    const examples = (word.word_examples ?? []) as Array<{
      id: string;
      chinese_text: string | null;
      pinyin: string | null;
      vietnamese_meaning: string | null;
    }>;
    for (const example of examples) {
      if (example.chinese_text?.trim()) {
        const text = example.chinese_text.trim();
        targets.set(`example:${example.id}:${text}`, {
          text,
          sourceType: "example",
          sourceRefId: example.id,
          sourceMetadata: {
            lessonId: lesson.id,
            wordId: word.id,
            wordSlug: word.slug,
            pinyin: example.pinyin,
            vietnameseMeaning: example.vietnamese_meaning,
          },
        });
      }
    }
  }

  return {
    label: lesson.title,
    targets: [...targets.values()],
  };
}

async function collectWordTexts(entries: string[]) {
  const { supabase } = await requireAdminSupabase();
  const lookup = buildWordLookupSets(entries);
  const result = new Map<string, TtsCacheSeedTarget>();

  const queries = [];
  if (lookup.ids.length > 0) {
    queries.push(supabase.from("words").select("id, slug, simplified, pinyin, vietnamese_meaning").in("id", lookup.ids));
  }
  if (lookup.slugs.length > 0) {
    queries.push(supabase.from("words").select("id, slug, simplified, pinyin, vietnamese_meaning").in("slug", lookup.slugs));
  }
  if (lookup.hanzi.length > 0) {
    queries.push(supabase.from("words").select("id, slug, simplified, pinyin, vietnamese_meaning").in("simplified", lookup.hanzi));
  }

  const responses = await Promise.all(queries);
  for (const response of responses) {
    if (response.error) {
      throw response.error;
    }

    for (const word of response.data ?? []) {
      if (word.simplified?.trim()) {
        const text = word.simplified.trim();
        result.set(word.id, {
          text,
          sourceType: "word",
          sourceRefId: word.id,
          sourceMetadata: {
            slug: word.slug,
            pinyin: word.pinyin,
            vietnameseMeaning: word.vietnamese_meaning,
          },
        });
      }
    }
  }

  return {
    label: "Selected words",
    targets: [...result.values()],
  };
}

async function collectExampleTexts(entries: string[]) {
  const { supabase } = await requireAdminSupabase();
  const lookup = buildExampleLookupSets(entries);
  const result = new Map<string, TtsCacheSeedTarget>();

  for (const item of lookup.chineseTexts.map((value) => value.trim()).filter(Boolean)) {
    result.set(`custom:${item}`, {
      text: item,
      sourceType: "custom",
      sourceRefId: null,
      sourceMetadata: null,
    });
  }

  if (lookup.ids.length > 0) {
    const { data, error } = await supabase
      .from("word_examples")
      .select("id, chinese_text, pinyin, vietnamese_meaning, word_id")
      .in("id", lookup.ids);

    if (error) {
      throw error;
    }

    for (const example of data ?? []) {
      if (example.chinese_text?.trim()) {
        const text = example.chinese_text.trim();
        result.set(`example:${example.id}:${text}`, {
          text,
          sourceType: "example",
          sourceRefId: example.id,
          sourceMetadata: {
            wordId: example.word_id,
            pinyin: example.pinyin,
            vietnameseMeaning: example.vietnamese_meaning,
          },
        });
      }
    }
  }

  return {
    label: "Selected examples",
    targets: [...result.values()],
  };
}

export async function preGenerateTtsCacheAction(formData: FormData) {
  const lessonIdValue = formData.get("lessonId");
  const parsed = preGenerateFormSchema.parse({
    lessonId: typeof lessonIdValue === "string" && lessonIdValue !== "" ? lessonIdValue : undefined,
    wordEntries: parseMultilineInput(formData.get("wordEntries")),
    exampleEntries: parseMultilineInput(formData.get("exampleEntries")),
  });

  const targets: TtsCacheSeedTarget[] = [];
  const labels: string[] = [];

  if (parsed.lessonId) {
    const lessonTexts = await collectLessonTexts(parsed.lessonId);
    labels.push(lessonTexts.label);
    targets.push(...lessonTexts.targets);
  }

  if (parsed.wordEntries.length > 0) {
    const wordTexts = await collectWordTexts(parsed.wordEntries);
    labels.push(wordTexts.label);
    targets.push(...wordTexts.targets);
  }

  if (parsed.exampleEntries.length > 0) {
    const exampleTexts = await collectExampleTexts(parsed.exampleEntries);
    labels.push(exampleTexts.label);
    targets.push(...exampleTexts.targets);
  }

  const uniqueTargets = [...new Map(
    targets
      .filter((item) => item.text.trim())
      .map((item) => [`${item.sourceType}:${item.sourceRefId ?? "none"}:${item.text.trim()}`, {
        ...item,
        text: item.text.trim(),
      } satisfies TtsCacheSeedTarget]),
  ).values()];

  if (uniqueTargets.length === 0) {
    redirectTo("/admin/tts-cache?status=empty");
  }

  if (uniqueTargets.length > MAX_PREGENERATION_ITEMS) {
    redirectTo(`/admin/tts-cache?status=too-many&count=${uniqueTargets.length}`);
  }

  let cacheHits = 0;
  let cacheMisses = 0;

  for (const target of uniqueTargets) {
    try {
      const resolved = await resolveTtsAudio({
        text: target.text,
        sourceText: target.text,
        sourceType: target.sourceType,
        sourceRefId: target.sourceRefId,
        sourceMetadata: target.sourceMetadata,
        languageCode: "zh-CN",
        scope: "lesson",
      });

      if (resolved.cacheStatus === "hit") {
        cacheHits += 1;
      } else {
        cacheMisses += 1;
      }
    } catch (error) {
      logger.error("tts_admin_pregeneration_failed", error, {
        textPreview: target.text.slice(0, 48),
        sourceType: target.sourceType,
        sourceRefId: target.sourceRefId,
      });
      redirectTo("/admin/tts-cache?status=error");
    }
  }

  revalidateAdminPaths(["/admin", "/admin/tts-cache"]);
  redirectTo(
    `/admin/tts-cache?status=success&items=${uniqueTargets.length}&hits=${cacheHits}&misses=${cacheMisses}&label=${encodeURIComponent(labels.join(", "))}`,
  );
}

export async function backfillTtsCacheSourceMetadataAction() {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("tts_audio_cache")
    .select("id, text_preview")
    .is("source_text", null)
    .limit(MAX_BACKFILL_ROWS);

  if (error) {
    throw error;
  }

  const candidates = (data ?? []).filter((row) => row.text_preview?.trim());

  for (const row of candidates) {
    const { error: updateError } = await supabase
      .from("tts_audio_cache")
      .update({
        source_text: row.text_preview.trim(),
        source_type: "custom",
      })
      .eq("id", row.id)
      .is("source_text", null);

    if (updateError) {
      throw updateError;
    }
  }

  revalidateAdminPaths(["/admin", "/admin/tts-cache"]);
  redirectTo(`/admin/tts-cache?status=backfill&items=${candidates.length}`);
}
