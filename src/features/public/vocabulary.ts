import { z } from "zod";

import { TAG_LABELS } from "@/features/vocabulary-sync/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const vocabularyFilterSchema = z.object({
  q: z.string().trim().min(1).optional(),
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

export interface PublicWordTag {
  slug: string;
  label: string;
}

export interface PublicWordSense {
  id: string;
  slug: string | null;
  pinyin: string;
  pinyinPlain: string | null;
  pinyinNumbered: string | null;
  partOfSpeech: string | null;
  meaningVi: string;
  meaningEn: string | null;
  usageNote: string | null;
  grammarRole: string | null;
  commonCollocations: unknown;
  senseOrder: number;
  isPrimary: boolean;
  sourceConfidence: "low" | "medium" | "high" | null;
  reviewStatus: "pending" | "needs_review" | "approved" | "rejected" | "applied";
  isPublished: boolean;
}

export interface VocabularyFilters {
  q?: string;
  hsk?: number;
  topic?: string;
  radical?: string;
}

export interface PublicWordListItem {
  id: string;
  slug: string;
  hanzi: string;
  simplified: string;
  traditional: string | null;
  pinyin: string;
  hanViet: string | null;
  vietnameseMeaning: string;
  englishMeaning: string | null;
  meaningsVi: string | null;
  hskLevel: number;
  notes: string | null;
  partOfSpeech: string | null;
  radicalSummary: string | null;
  characterStructureType: string | null;
  ambiguityFlag: boolean;
  sourceConfidence: "low" | "medium" | "high" | null;
  topic: PublicTopicFilterOption | null;
  radicals: PublicRadicalFilterOption[];
  topicTags: PublicWordTag[];
}

export interface PublicWordListPage {
  items: PublicWordListItem[];
  totalItems: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface PublicWordDetail extends PublicWordListItem {
  normalizedText: string | null;
  traditionalVariant: string | null;
  mnemonic: string | null;
  structureExplanation: string | null;
  ambiguityNote: string | null;
  readingCandidates: string | null;
  senses: PublicWordSense[];
  resolvedSenses: Array<
    PublicWordSense & {
      shortMeaning: string;
      examples: Array<{
        id: string;
        senseId: string | null;
        chineseText: string;
        pinyin: string | null;
        vietnameseMeaning: string;
        sortOrder: number;
      }>;
    }
  >;
  examples: Array<{
    id: string;
    senseId: string | null;
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

function parsePipeDelimitedText(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getHumanLabel(value: string) {
  return TAG_LABELS[value] ?? value;
}

function summarizeMeaning(value: string, maxLength = 32) {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function createLegacyFallbackSense(word: {
  id: string;
  pinyin: string;
  part_of_speech: string | null;
  vietnamese_meaning: string;
  english_meaning: string | null;
  notes: string | null;
  source_confidence: "low" | "medium" | "high" | null;
}) {
  return {
    id: `legacy-${word.id}`,
    slug: null,
    pinyin: word.pinyin,
    pinyinPlain: null,
    pinyinNumbered: null,
    partOfSpeech: word.part_of_speech,
    meaningVi: word.vietnamese_meaning,
    meaningEn: word.english_meaning,
    usageNote: word.notes,
    grammarRole: null,
    commonCollocations: null,
    senseOrder: 1,
    isPrimary: true,
    sourceConfidence: word.source_confidence,
    reviewStatus: "approved" as const,
    isPublished: true,
  } satisfies PublicWordSense;
}

function buildResolvedSenses(input: {
  senses: PublicWordSense[];
  examples: Array<{
    id: string;
    senseId: string | null;
    chineseText: string;
    pinyin: string | null;
    vietnameseMeaning: string;
    sortOrder: number;
  }>;
}) {
  const fallbackSenseId = input.senses.find((sense) => sense.isPrimary)?.id ?? input.senses[0]?.id ?? null;

  return input.senses.map((sense) => ({
    ...sense,
    shortMeaning: summarizeMeaning(sense.meaningVi),
    examples: input.examples.filter((example) =>
      example.senseId === sense.id || (example.senseId === null && fallbackSenseId === sense.id),
    ),
  }));
}

function mapWordListItem(row: {
  id: string;
  slug: string;
  simplified: string;
  traditional: string | null;
  hanzi: string;
  pinyin: string;
  han_viet: string | null;
  vietnamese_meaning: string;
  english_meaning: string | null;
  meanings_vi: string | null;
  hsk_level: number;
  notes: string | null;
  part_of_speech: string | null;
  radical_summary: string | null;
  character_structure_type: string | null;
  ambiguity_flag: boolean;
  source_confidence: "low" | "medium" | "high" | null;
  topics: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
}): PublicWordListItem {
  const topic = normalizeRelation(row.topics);

  return {
    id: row.id,
    slug: row.slug,
    simplified: row.simplified,
    traditional: row.traditional,
    hanzi: row.hanzi,
    pinyin: row.pinyin,
    hanViet: row.han_viet,
    vietnameseMeaning: row.vietnamese_meaning,
    englishMeaning: row.english_meaning,
    meaningsVi: row.meanings_vi,
    hskLevel: row.hsk_level,
    notes: row.notes,
    partOfSpeech: row.part_of_speech,
    radicalSummary: row.radical_summary,
    characterStructureType: row.character_structure_type,
    ambiguityFlag: row.ambiguity_flag,
    sourceConfidence: row.source_confidence,
    topic: topic
      ? {
          id: topic.id,
          name: topic.name,
          slug: topic.slug,
        }
      : null,
    radicals: [],
    topicTags: [],
  };
}

async function listWordRadicals(wordIds: string[]) {
  if (wordIds.length === 0) {
    return new Map<string, PublicRadicalFilterOption[]>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("word_radicals")
    .select("word_id, sort_order, radicals(id, radical, meaning_vi)")
    .in("word_id", wordIds)
    .order("sort_order");

  if (error) {
    throw error;
  }

  const grouped = new Map<string, PublicRadicalFilterOption[]>();

  for (const row of (data ?? []) as Array<{
    word_id: string;
    sort_order: number;
    radicals:
      | { id: string; radical: string; meaning_vi: string }
      | Array<{ id: string; radical: string; meaning_vi: string }>
      | null;
  }>) {
    const radical = normalizeRelation(row.radicals);
    if (!radical) {
      continue;
    }

    const current = grouped.get(row.word_id) ?? [];
    current.push({
      id: radical.id,
      radical: radical.radical,
      meaningVi: radical.meaning_vi,
    });
    grouped.set(row.word_id, current);
  }

  return grouped;
}

async function listWordTags(wordIds: string[]) {
  if (wordIds.length === 0) {
    return new Map<string, PublicWordTag[]>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("word_tag_links")
    .select("word_id, word_tags(slug, label)")
    .in("word_id", wordIds);

  if (error) {
    throw error;
  }

  const grouped = new Map<string, PublicWordTag[]>();

  for (const row of (data ?? []) as Array<{
    word_id: string;
    word_tags:
      | { slug: string; label: string }
      | Array<{ slug: string; label: string }>
      | null;
  }>) {
    const tag = normalizeRelation(row.word_tags);
    if (!tag) {
      continue;
    }

    const current = grouped.get(row.word_id) ?? [];
    current.push({
      slug: tag.slug,
      label: tag.label,
    });
    grouped.set(row.word_id, current);
  }

  return grouped;
}

function attachWordRelations<T extends PublicWordListItem>(
  words: T[],
  radicalsByWordId: Map<string, PublicRadicalFilterOption[]>,
  tagsByWordId: Map<string, PublicWordTag[]>,
) {
  return words.map((word) => ({
    ...word,
    radicals: radicalsByWordId.get(word.id) ?? [],
    topicTags: tagsByWordId.get(word.id) ?? [],
  }));
}

export function parseVocabularyFilters(searchParams: Record<string, string | string[] | undefined>) {
  return vocabularyFilterSchema.parse({
    q: optionalQueryValue(searchParams.q),
    hsk: optionalQueryValue(searchParams.hsk),
    topic: optionalQueryValue(searchParams.topic),
    radical: optionalQueryValue(searchParams.radical),
  });
}

export function parseVocabularyPage(value: string | string[] | undefined) {
  const normalized = takeFirst(value);
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
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

export async function listPublicWordsPage(
  filters: VocabularyFilters,
  input: { page: number; pageSize: number },
): Promise<PublicWordListPage> {
  const supabase = await createSupabaseServerClient();
  let filteredWordIds: string[] | null = null;

  if (filters.radical) {
    const { data: radicalLinks, error: radicalLinksError } = await supabase
      .from("word_radicals")
      .select("word_id")
      .eq("radical_id", filters.radical);

    if (radicalLinksError) {
      throw radicalLinksError;
    }

    filteredWordIds = [...new Set((radicalLinks ?? []).map((row) => row.word_id))];

    if (filteredWordIds.length === 0) {
      return {
        items: [],
        totalItems: 0,
        page: 1,
        pageSize: input.pageSize,
        pageCount: 1,
      };
    }
  }

  const topicSelect = filters.topic ? "topics!inner" : "topics";
  let countQuery = supabase
    .from("words")
    .select(`id, ${topicSelect}(slug)`, { count: "exact", head: true })
    .eq("is_published", true);

  let listQuery = supabase
    .from("words")
    .select(
      `id, slug, simplified, traditional, hanzi, pinyin, han_viet, vietnamese_meaning, english_meaning, meanings_vi, hsk_level, notes, part_of_speech, radical_summary, character_structure_type, ambiguity_flag, source_confidence, ${topicSelect}(id, name, slug)`,
      { count: "exact" },
    )
    .eq("is_published", true)
    .order("hsk_level")
    .order("hanzi");

  if (filters.q) {
    const escaped = filters.q.replace(/[%_,]/g, "\\$&");
    const searchExpression = [
      `slug.ilike.%${escaped}%`,
      `simplified.ilike.%${escaped}%`,
      `traditional.ilike.%${escaped}%`,
      `hanzi.ilike.%${escaped}%`,
      `pinyin.ilike.%${escaped}%`,
      `han_viet.ilike.%${escaped}%`,
      `vietnamese_meaning.ilike.%${escaped}%`,
      `english_meaning.ilike.%${escaped}%`,
      `normalized_text.ilike.%${escaped}%`,
      `meanings_vi.ilike.%${escaped}%`,
    ].join(",");

    countQuery = countQuery.or(searchExpression);
    listQuery = listQuery.or(searchExpression);
  }

  if (filters.hsk) {
    countQuery = countQuery.eq("hsk_level", filters.hsk);
    listQuery = listQuery.eq("hsk_level", filters.hsk);
  }

  if (filters.topic) {
    countQuery = countQuery.eq("topics.slug", filters.topic);
    listQuery = listQuery.eq("topics.slug", filters.topic);
  }

  if (filteredWordIds) {
    countQuery = countQuery.in("id", filteredWordIds);
    listQuery = listQuery.in("id", filteredWordIds);
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw countError;
  }

  const pageSize = input.pageSize;
  const totalItems = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(input.page, pageCount);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await listQuery.range(from, to);

  if (error) {
    throw error;
  }

  const words = (data ?? []).map(mapWordListItem);
  const [radicalsByWordId, tagsByWordId] = await Promise.all([
    listWordRadicals(words.map((word) => word.id)),
    listWordTags(words.map((word) => word.id)),
  ]);

  return {
    items: attachWordRelations(words, radicalsByWordId, tagsByWordId),
    totalItems,
    page,
    pageSize,
    pageCount,
  };
}

export async function getPublicWordBySlug(slug: string): Promise<PublicWordDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: word, error: wordError } = await supabase
    .from("words")
    .select(
      "id, slug, simplified, traditional, hanzi, pinyin, han_viet, vietnamese_meaning, english_meaning, meanings_vi, normalized_text, traditional_variant, hsk_level, notes, part_of_speech, radical_summary, mnemonic, character_structure_type, structure_explanation, ambiguity_flag, ambiguity_note, reading_candidates, source_confidence, topics(id, name, slug)",
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
    .select("id, sense_id, chinese_text, pinyin, vietnamese_meaning, sort_order")
    .eq("word_id", word.id)
    .order("sort_order");

  if (examplesError) {
    throw examplesError;
  }

  const { data: senses, error: sensesError } = await supabase
    .from("word_senses")
    .select(
      "id, slug, pinyin, pinyin_plain, pinyin_numbered, part_of_speech, meaning_vi, meaning_en, usage_note, grammar_role, common_collocations, sense_order, is_primary, source_confidence, review_status, is_published",
    )
    .eq("word_id", word.id)
    .eq("is_published", true)
    .order("sense_order")
    .order("created_at");

  if (sensesError) {
    throw sensesError;
  }

  const mapped = mapWordListItem({
    id: word.id,
    slug: word.slug,
    simplified: word.simplified,
    traditional: word.traditional,
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    han_viet: word.han_viet,
    vietnamese_meaning: word.vietnamese_meaning,
    english_meaning: word.english_meaning,
    meanings_vi: word.meanings_vi,
    hsk_level: word.hsk_level,
    notes: word.notes,
    part_of_speech: word.part_of_speech,
    radical_summary: word.radical_summary,
    character_structure_type: word.character_structure_type,
    ambiguity_flag: word.ambiguity_flag,
    source_confidence: word.source_confidence,
    topics: word.topics,
  });

  const [radicalsByWordId, tagsByWordId] = await Promise.all([
    listWordRadicals([word.id]),
    listWordTags([word.id]),
  ]);
  const [wordWithRelations] = attachWordRelations([mapped], radicalsByWordId, tagsByWordId);

  const resolvedExamples = (examples ?? []).map((example) => ({
    id: example.id,
    senseId: example.sense_id ?? ((senses ?? []).length > 0 ? null : `legacy-${word.id}`),
    chineseText: example.chinese_text,
    pinyin: example.pinyin,
    vietnameseMeaning: example.vietnamese_meaning,
    sortOrder: example.sort_order,
  }));

  const resolvedWordSenses =
    (senses ?? []).length > 0
      ? (senses ?? []).map((sense) => ({
          id: sense.id,
          slug: sense.slug,
          pinyin: sense.pinyin,
          pinyinPlain: sense.pinyin_plain,
          pinyinNumbered: sense.pinyin_numbered,
          partOfSpeech: sense.part_of_speech,
          meaningVi: sense.meaning_vi,
          meaningEn: sense.meaning_en,
          usageNote: sense.usage_note,
          grammarRole: sense.grammar_role,
          commonCollocations: sense.common_collocations,
          senseOrder: sense.sense_order,
          isPrimary: sense.is_primary,
          sourceConfidence: sense.source_confidence,
          reviewStatus: sense.review_status,
          isPublished: sense.is_published,
        }))
      : [
          createLegacyFallbackSense({
            id: word.id,
            pinyin: word.pinyin,
            part_of_speech: word.part_of_speech,
            vietnamese_meaning: word.vietnamese_meaning,
            english_meaning: word.english_meaning,
            notes: word.notes,
            source_confidence: word.source_confidence,
          }),
        ];

  return {
    ...wordWithRelations,
    normalizedText: word.normalized_text,
    traditionalVariant: word.traditional_variant,
    mnemonic: word.mnemonic,
    structureExplanation: word.structure_explanation,
    ambiguityNote: word.ambiguity_note,
    readingCandidates: word.reading_candidates,
    senses: resolvedWordSenses,
    examples: resolvedExamples,
    resolvedSenses: buildResolvedSenses({
      senses: resolvedWordSenses,
      examples: resolvedExamples,
    }),
  } satisfies PublicWordDetail;
}

export function formatPublicPartOfSpeech(value: string | null) {
  if (!value) {
    return [];
  }

  return parsePipeDelimitedText(value).map((entry) => ({
    value: entry,
    label: getHumanLabel(entry),
  }));
}

export function formatPublicStructureType(value: string | null) {
  if (!value) {
    return null;
  }

  return {
    value,
    label: getHumanLabel(value),
  };
}
