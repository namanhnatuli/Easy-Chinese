import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const vocabularyFilterSchema = z.object({
  hsk: z.coerce.number().int().min(1).max(9).optional(),
  topic: z.string().trim().min(1).optional(),
  radical: z.string().uuid().optional(),
});

export interface PublicTopicFilterOption {
  id: string;
  name: string;
  slug: string;
}

export interface PublicRadicalFilterOption {
  id: string;
  radical: string;
  meaningVi: string;
}

export interface VocabularyFilters {
  hsk?: number;
  topic?: string;
  radical?: string;
}

export interface PublicWordListItem {
  id: string;
  slug: string;
  hanzi: string;
  pinyin: string;
  hanViet: string | null;
  vietnameseMeaning: string;
  hskLevel: number;
  notes: string | null;
  topic: PublicTopicFilterOption | null;
  radical: PublicRadicalFilterOption | null;
}

export interface PublicWordDetail extends PublicWordListItem {
  simplified: string;
  traditional: string | null;
  englishMeaning: string | null;
  examples: Array<{
    id: string;
    chineseText: string;
    pinyin: string | null;
    vietnameseMeaning: string;
    sortOrder: number;
  }>;
}

function takeFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function optionalQueryValue(value: string | string[] | undefined): string | undefined {
  const resolved = takeFirst(value)?.trim();
  return resolved ? resolved : undefined;
}

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function mapWordListItem(row: {
  id: string;
  slug: string;
  hanzi: string;
  pinyin: string;
  han_viet: string | null;
  vietnamese_meaning: string;
  hsk_level: number;
  notes: string | null;
  topics: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
  radicals:
    | { id: string; radical: string; meaning_vi: string }
    | { id: string; radical: string; meaning_vi: string }[]
    | null;
}): PublicWordListItem {
  const topic = normalizeRelation(row.topics);
  const radical = normalizeRelation(row.radicals);

  return {
    id: row.id,
    slug: row.slug,
    hanzi: row.hanzi,
    pinyin: row.pinyin,
    hanViet: row.han_viet,
    vietnameseMeaning: row.vietnamese_meaning,
    hskLevel: row.hsk_level,
    notes: row.notes,
    topic: topic
      ? {
          id: topic.id,
          name: topic.name,
          slug: topic.slug,
        }
      : null,
    radical: radical
      ? {
          id: radical.id,
          radical: radical.radical,
          meaningVi: radical.meaning_vi,
        }
      : null,
  };
}

export function parseVocabularyFilters(searchParams: Record<string, string | string[] | undefined>) {
  return vocabularyFilterSchema.parse({
    hsk: optionalQueryValue(searchParams.hsk),
    topic: optionalQueryValue(searchParams.topic),
    radical: optionalQueryValue(searchParams.radical),
  });
}

export async function listVocabularyFilterOptions(): Promise<{
  topics: PublicTopicFilterOption[];
  radicals: PublicRadicalFilterOption[];
}> {
  const supabase = await createSupabaseServerClient();
  const [{ data: topics, error: topicsError }, { data: radicals, error: radicalsError }] =
    await Promise.all([
      supabase.from("topics").select("id, name, slug").order("name"),
      supabase.from("radicals").select("id, radical, meaning_vi").order("radical"),
    ]);

  if (topicsError) {
    throw topicsError;
  }

  if (radicalsError) {
    throw radicalsError;
  }

  return {
    topics: (topics ?? []).map((topic) => ({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
    })),
    radicals: (radicals ?? []).map((radical) => ({
      id: radical.id,
      radical: radical.radical,
      meaningVi: radical.meaning_vi,
    })),
  };
}

export async function listPublicWords(filters: VocabularyFilters): Promise<PublicWordListItem[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("words")
    .select(
      "id, slug, hanzi, pinyin, han_viet, vietnamese_meaning, hsk_level, notes, topics(id, name, slug), radicals(id, radical, meaning_vi)",
    )
    .eq("is_published", true)
    .order("hsk_level")
    .order("hanzi");

  if (filters.hsk) {
    query = query.eq("hsk_level", filters.hsk);
  }

  if (filters.topic) {
    query = query.eq("topics.slug", filters.topic);
  }

  if (filters.radical) {
    query = query.eq("radical_id", filters.radical);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapWordListItem);
}

export async function getPublicWordBySlug(slug: string): Promise<PublicWordDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: word, error: wordError } = await supabase
    .from("words")
    .select(
      "id, slug, simplified, traditional, hanzi, pinyin, han_viet, vietnamese_meaning, english_meaning, hsk_level, notes, topics(id, name, slug), radicals(id, radical, meaning_vi)",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (wordError) {
    throw wordError;
  }

  if (!word) {
    return null;
  }

  const { data: examples, error: examplesError } = await supabase
    .from("word_examples")
    .select("id, chinese_text, pinyin, vietnamese_meaning, sort_order")
    .eq("word_id", word.id)
    .order("sort_order");

  if (examplesError) {
    throw examplesError;
  }

  const mapped = mapWordListItem({
    id: word.id,
    slug: word.slug,
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    han_viet: word.han_viet,
    vietnamese_meaning: word.vietnamese_meaning,
    hsk_level: word.hsk_level,
    notes: word.notes,
    topics: word.topics,
    radicals: word.radicals,
  });

  return {
    ...mapped,
    simplified: word.simplified,
    traditional: word.traditional,
    englishMeaning: word.english_meaning,
    examples: (examples ?? []).map((example) => ({
      id: example.id,
      chineseText: example.chinese_text,
      pinyin: example.pinyin,
      vietnameseMeaning: example.vietnamese_meaning,
      sortOrder: example.sort_order,
    })),
  };
}
