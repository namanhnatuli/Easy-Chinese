import { z } from "zod";

const lessonFilterSchema = z.object({
  hsk: z.coerce.number().int().min(1).max(9).optional(),
  topic: z.string().trim().min(1).optional(),
});

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

export interface LessonFilters {
  hsk?: number;
  topic?: string;
}

export interface PublicLessonListItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  hskLevel: number;
  sortOrder: number;
  topic: {
    id: string;
    name: string;
    slug: string;
  } | null;
  wordCount: number;
  grammarCount: number;
}

export interface PublicLessonWord {
  id: string;
  slug: string;
  simplified: string;
  traditional: string | null;
  hanzi: string;
  pinyin: string;
  hanViet: string | null;
  vietnameseMeaning: string;
  sortOrder: number;
  notes?: string | null;
  mnemonic?: string | null;
  examples?: Array<{
    id: string;
    chineseText: string;
    pinyin: string;
    vietnameseMeaning: string;
  }>;
}

export interface PublicLessonGrammarPoint {
  id: string;
  slug: string;
  title: string;
  structureText: string;
  explanationVi: string;
  sortOrder: number;
}

export interface PublicLessonDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  hskLevel: number;
  sortOrder: number;
  topic: {
    id: string;
    name: string;
    slug: string;
  } | null;
  words: PublicLessonWord[];
  grammarPoints: PublicLessonGrammarPoint[];
}

export function parseLessonFilters(searchParams: Record<string, string | string[] | undefined>) {
  return lessonFilterSchema.parse({
    hsk: optionalQueryValue(searchParams.hsk),
    topic: optionalQueryValue(searchParams.topic),
  });
}
