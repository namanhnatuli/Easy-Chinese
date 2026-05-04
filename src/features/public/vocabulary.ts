import { z } from "zod";

import { TAG_LABELS } from "@/features/vocabulary-sync/constants";

const vocabularyFilterSchema = z.object({
  q: z.string().trim().min(1).optional(),
  pinyin: z.string().trim().min(1).optional(),
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
  pinyin?: string;
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

export function normalizeRelation<T>(value: T | T[] | null): T | null {
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

export function createLegacyFallbackSense(word: {
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

export function buildResolvedSenses(input: {
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

export function mapWordListItem(row: {
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

export function attachWordRelations<T extends PublicWordListItem>(
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
    pinyin: optionalQueryValue(searchParams.pinyin),
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
