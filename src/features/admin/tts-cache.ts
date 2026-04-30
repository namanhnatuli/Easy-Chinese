"use server";

import { z } from "zod";

import { requireAdminSupabase, redirectTo, revalidateAdminPaths } from "@/features/admin/shared";
import { resolveTtsAudio } from "@/features/tts/service";
import { logger } from "@/lib/logger";

const DEFAULT_UNUSED_DAYS = 30;
const DEFAULT_UNUSED_LIMIT = 25;
const MAX_PREGENERATION_ITEMS = 100;

const preGenerateFormSchema = z.object({
  lessonId: z.string().uuid().optional(),
  wordEntries: z.array(z.string().min(1)).max(MAX_PREGENERATION_ITEMS),
  exampleEntries: z.array(z.string().min(1)).max(MAX_PREGENERATION_ITEMS),
});

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
    sizeBytes: number;
    accessCount: number;
    createdAt: string;
    lastAccessedAt: string | null;
  }>;
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
}): Promise<TtsCacheAdminOverview> {
  const staleDays = Math.max(1, params?.staleDays ?? DEFAULT_UNUSED_DAYS);
  const staleLimit = Math.max(1, Math.min(params?.staleLimit ?? DEFAULT_UNUSED_LIMIT, 100));
  const { supabase } = await requireAdminSupabase();

  const [{ data: cacheRows, error: cacheError }, { data: lessons, error: lessonsError }] = await Promise.all([
    supabase
      .from("tts_audio_cache")
      .select(
        "id, cache_key, provider, voice, language_code, text_preview, size_bytes, character_count, access_count, created_at, last_accessed_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("lessons")
      .select("id, title, slug, is_published")
      .order("is_published", { ascending: false })
      .order("sort_order")
      .order("title"),
  ]);

  if (cacheError) {
    throw cacheError;
  }

  if (lessonsError) {
    throw lessonsError;
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
        sizeBytes: Number(row.size_bytes ?? 0),
        characterCount: row.character_count ?? 0,
        accessCount: row.access_count ?? 0,
        createdAt: row.created_at,
        lastAccessedAt: row.last_accessed_at,
      })),
    staleEntries,
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
      .select("sort_order, words!inner(id, simplified, word_examples(id, chinese_text, sort_order))")
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

  const texts = new Set<string>();

  for (const row of lessonWords ?? []) {
    const word = Array.isArray(row.words) ? row.words[0] : row.words;
    if (!word) {
      continue;
    }

    if (word.simplified?.trim()) {
      texts.add(word.simplified.trim());
    }

    const examples = (word.word_examples ?? []) as Array<{ chinese_text: string | null }>;
    for (const example of examples) {
      if (example.chinese_text?.trim()) {
        texts.add(example.chinese_text.trim());
      }
    }
  }

  return {
    label: lesson.title,
    texts: [...texts],
  };
}

async function collectWordTexts(entries: string[]) {
  const { supabase } = await requireAdminSupabase();
  const lookup = buildWordLookupSets(entries);
  const result = new Map<string, string>();

  const queries = [];
  if (lookup.ids.length > 0) {
    queries.push(supabase.from("words").select("id, slug, simplified").in("id", lookup.ids));
  }
  if (lookup.slugs.length > 0) {
    queries.push(supabase.from("words").select("id, slug, simplified").in("slug", lookup.slugs));
  }
  if (lookup.hanzi.length > 0) {
    queries.push(supabase.from("words").select("id, slug, simplified").in("simplified", lookup.hanzi));
  }

  const responses = await Promise.all(queries);
  for (const response of responses) {
    if (response.error) {
      throw response.error;
    }

    for (const word of response.data ?? []) {
      if (word.simplified?.trim()) {
        result.set(word.id, word.simplified.trim());
      }
    }
  }

  return {
    label: "Selected words",
    texts: [...result.values()],
  };
}

async function collectExampleTexts(entries: string[]) {
  const { supabase } = await requireAdminSupabase();
  const lookup = buildExampleLookupSets(entries);
  const result = new Set<string>(lookup.chineseTexts.map((item) => item.trim()).filter(Boolean));

  if (lookup.ids.length > 0) {
    const { data, error } = await supabase
      .from("word_examples")
      .select("id, chinese_text")
      .in("id", lookup.ids);

    if (error) {
      throw error;
    }

    for (const example of data ?? []) {
      if (example.chinese_text?.trim()) {
        result.add(example.chinese_text.trim());
      }
    }
  }

  return {
    label: "Selected examples",
    texts: [...result],
  };
}

export async function preGenerateTtsCacheAction(formData: FormData) {
  const lessonIdValue = formData.get("lessonId");
  const parsed = preGenerateFormSchema.parse({
    lessonId: typeof lessonIdValue === "string" && lessonIdValue !== "" ? lessonIdValue : undefined,
    wordEntries: parseMultilineInput(formData.get("wordEntries")),
    exampleEntries: parseMultilineInput(formData.get("exampleEntries")),
  });

  const targets: string[] = [];
  const labels: string[] = [];

  if (parsed.lessonId) {
    const lessonTexts = await collectLessonTexts(parsed.lessonId);
    labels.push(lessonTexts.label);
    targets.push(...lessonTexts.texts);
  }

  if (parsed.wordEntries.length > 0) {
    const wordTexts = await collectWordTexts(parsed.wordEntries);
    labels.push(wordTexts.label);
    targets.push(...wordTexts.texts);
  }

  if (parsed.exampleEntries.length > 0) {
    const exampleTexts = await collectExampleTexts(parsed.exampleEntries);
    labels.push(exampleTexts.label);
    targets.push(...exampleTexts.texts);
  }

  const uniqueTexts = [...new Set(targets.map((item) => item.trim()).filter(Boolean))];

  if (uniqueTexts.length === 0) {
    redirectTo("/admin/tts-cache?status=empty");
  }

  if (uniqueTexts.length > MAX_PREGENERATION_ITEMS) {
    redirectTo(`/admin/tts-cache?status=too-many&count=${uniqueTexts.length}`);
  }

  let cacheHits = 0;
  let cacheMisses = 0;

  for (const text of uniqueTexts) {
    try {
      const resolved = await resolveTtsAudio({
        text,
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
        textPreview: text.slice(0, 48),
      });
      redirectTo("/admin/tts-cache?status=error");
    }
  }

  revalidateAdminPaths(["/admin", "/admin/tts-cache"]);
  redirectTo(
    `/admin/tts-cache?status=success&items=${uniqueTexts.length}&hits=${cacheHits}&misses=${cacheMisses}&label=${encodeURIComponent(labels.join(", "))}`,
  );
}
