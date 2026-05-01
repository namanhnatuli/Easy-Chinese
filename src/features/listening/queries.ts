import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  getListeningDifficulty,
  isValidListeningText,
  matchesListeningDifficulty,
  matchesListeningSourceType,
  normalizeListeningSourceType,
  parseListeningSourceMetadata,
  resolveListeningSourceText,
  selectListeningPracticeItems,
} from "@/features/listening/helpers";
import type {
  ListeningDifficultyFilter,
  ListeningPracticeItem,
  ListeningProgressSnapshot,
  ListeningSourceMetadata,
  ListeningSourceTypeFilter,
} from "@/features/listening/types";
import { getAudioUrlForStorageObject } from "@/features/tts/repository";

type ListeningCacheRow = {
  id: string;
  cache_key: string;
  provider: "azure" | "google";
  voice: string;
  language_code: string;
  text_preview: string;
  source_text: string | null;
  source_type: string | null;
  source_ref_id: string | null;
  source_metadata: Record<string, unknown> | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  character_count: number;
  created_at: string;
  last_accessed_at: string | null;
};

type ListeningWordMatch = {
  id: string;
  slug: string;
  hanzi: string;
  pinyin: string;
  vietnamese_meaning: string;
  hsk_level: number;
};

type ListeningExampleMatch = {
  id: string;
  chinese_text: string;
  pinyin: string | null;
  vietnamese_meaning: string | null;
  words: ListeningWordMatch | ListeningWordMatch[] | null;
};

type ListeningArticleMatch = {
  id: string;
  slug: string;
  title: string;
};

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

async function listListeningProgressByAudioIds(userId: string, audioIds: string[]) {
  if (audioIds.length === 0) {
    return new Map<string, ListeningProgressSnapshot>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_listening_progress")
    .select(
      "id, tts_audio_cache_id, status, attempt_count, correct_count, almost_count, incorrect_count, skipped_count, best_score, last_input, last_practiced_at",
    )
    .eq("user_id", userId)
    .in("tts_audio_cache_id", audioIds);

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).map((row) => [
      row.tts_audio_cache_id,
      {
        id: row.id,
        status: row.status,
        attemptCount: row.attempt_count,
        correctCount: row.correct_count,
        almostCount: row.almost_count,
        incorrectCount: row.incorrect_count,
        skippedCount: row.skipped_count,
        bestScore: Number(row.best_score ?? 0),
        lastInput: row.last_input,
        lastPracticedAt: row.last_practiced_at,
      } satisfies ListeningProgressSnapshot,
    ]),
  );
}

async function listListeningWordExamplesByText(texts: string[]) {
  if (texts.length === 0) {
    return new Map<string, ListeningExampleMatch>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("word_examples")
    .select(
      "id, chinese_text, pinyin, vietnamese_meaning, words!inner(id, slug, hanzi, pinyin, vietnamese_meaning, hsk_level, is_published)",
    )
    .in("chinese_text", texts)
    .eq("words.is_published", true);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.chinese_text, row as ListeningExampleMatch]));
}

async function listListeningWordsByHanzi(texts: string[]) {
  if (texts.length === 0) {
    return new Map<string, ListeningWordMatch>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("words")
    .select("id, slug, hanzi, pinyin, vietnamese_meaning, hsk_level")
    .in("hanzi", texts)
    .eq("is_published", true);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.hanzi, row as ListeningWordMatch]));
}

async function listListeningArticlesByIds(articleIds: string[]) {
  if (articleIds.length === 0) {
    return new Map<string, ListeningArticleMatch>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("learning_articles")
    .select("id, slug, title")
    .in("id", articleIds)
    .eq("is_published", true);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.id, row as ListeningArticleMatch]));
}

async function resolveListeningAudioUrl(row: ListeningCacheRow) {
  return getAudioUrlForStorageObject({
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
  });
}

export async function getListeningPracticeItems({
  userId,
  limit = 12,
  difficulty = "all",
  sourceType = "all",
  maxCharacterCount = 80,
}: {
  userId?: string | null;
  limit?: number;
  difficulty?: ListeningDifficultyFilter;
  sourceType?: ListeningSourceTypeFilter;
  maxCharacterCount?: number;
}): Promise<ListeningPracticeItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tts_audio_cache")
    .select(
      "id, cache_key, provider, voice, language_code, text_preview, source_text, source_type, source_ref_id, source_metadata, storage_bucket, storage_path, mime_type, character_count, created_at, last_accessed_at",
    )
    .eq("language_code", "zh-CN")
    .gte("character_count", 3)
    .lte("character_count", maxCharacterCount)
    .order("last_accessed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 6, 60));

  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as ListeningCacheRow[]).filter(
    (row) => {
      const sourceText = resolveListeningSourceText(row.source_text, row.text_preview);
      const normalizedSourceType = normalizeListeningSourceType(row.source_type);
      return row.storage_path
        && isValidListeningText(sourceText)
        && matchesListeningDifficulty(row.character_count, difficulty)
        && matchesListeningSourceType(normalizedSourceType, sourceType);
    },
  );

  const progressByAudioId = userId ? await listListeningProgressByAudioIds(userId, rows.map((row) => row.id)) : new Map();
  const sourceTexts = rows.map((row) => resolveListeningSourceText(row.source_text, row.text_preview));
  const exampleByText = await listListeningWordExamplesByText(sourceTexts);
  const standaloneWordByText = await listListeningWordsByHanzi(sourceTexts);
  const metadataByRowId = new Map<string, ListeningSourceMetadata | null>(
    rows.map((row) => [row.id, parseListeningSourceMetadata(row.source_metadata)]),
  );
  const articleIds = rows
    .map((row) => {
      const metadata = metadataByRowId.get(row.id);
      if (row.source_type === "article" && row.source_ref_id) {
        return row.source_ref_id;
      }
      return metadata?.articleId ?? null;
    })
    .filter((value): value is string => Boolean(value));
  const articleById = await listListeningArticlesByIds(articleIds);
  const selectedRows = rows.slice(0, Math.max(limit * 4, 24));
  const audioUrls = await Promise.allSettled(selectedRows.map((row) => resolveListeningAudioUrl(row)));

  const items = selectedRows.flatMap((row, index) => {
    const audioUrl = audioUrls[index];
    if (!audioUrl || audioUrl.status !== "fulfilled") {
      return [];
    }

    const sourceText = resolveListeningSourceText(row.source_text, row.text_preview);
    const sourceType = normalizeListeningSourceType(row.source_type);
    const sourceMetadata = metadataByRowId.get(row.id) ?? null;
    const example = exampleByText.get(sourceText);
    const linkedWord = normalizeRelation(example?.words) ?? standaloneWordByText.get(sourceText) ?? null;
    const articleId = sourceType === "article" ? row.source_ref_id : sourceMetadata?.articleId ?? null;
    const linkedArticle = articleId ? articleById.get(articleId) ?? null : null;
    const pinyin = sourceMetadata?.pinyin ?? example?.pinyin ?? linkedWord?.pinyin ?? null;
    const vietnameseMeaning = sourceMetadata?.vietnameseMeaning ?? example?.vietnamese_meaning ?? linkedWord?.vietnamese_meaning ?? null;

    return [
      {
        id: row.id,
        chineseText: sourceText,
        textPreview: row.text_preview,
        sourceText,
        sourceType,
        sourceRefId: row.source_ref_id,
        sourceMetadata,
        pinyin,
        vietnameseMeaning,
        audioUrl: audioUrl.value,
        cacheKey: row.cache_key,
        provider: row.provider,
        voice: row.voice,
        languageCode: row.language_code,
        mimeType: row.mime_type,
        characterCount: row.character_count,
        difficulty: getListeningDifficulty(row.character_count),
        linkedWord: linkedWord
          ? {
              id: linkedWord.id,
              slug: linkedWord.slug,
              hanzi: linkedWord.hanzi,
              pinyin: linkedWord.pinyin,
              vietnameseMeaning: linkedWord.vietnamese_meaning,
              hskLevel: linkedWord.hsk_level,
            }
          : null,
        linkedArticle: linkedArticle
          ? {
              id: linkedArticle.id,
              slug: linkedArticle.slug,
              title: linkedArticle.title,
            }
          : null,
        progress: progressByAudioId.get(row.id) ?? null,
        createdAt: row.created_at,
        lastAccessedAt: row.last_accessed_at,
      } satisfies ListeningPracticeItem,
    ];
  });

  return selectListeningPracticeItems(items, limit);
}

export async function getNextListeningItem(input: {
  userId?: string | null;
  difficulty?: ListeningDifficultyFilter;
  sourceType?: ListeningSourceTypeFilter;
  maxCharacterCount?: number;
}) {
  const items = await getListeningPracticeItems({
    ...input,
    limit: 1,
  });

  return items[0] ?? null;
}

export async function getListeningSessionItems(input: {
  userId?: string | null;
  difficulty?: ListeningDifficultyFilter;
  sourceType?: ListeningSourceTypeFilter;
  limit?: number;
  maxCharacterCount?: number;
}) {
  return getListeningPracticeItems(input);
}
