import { z } from "zod";

import { getLearningArticleTypeLabel } from "@/features/articles/constants";
import type { LearningArticleType } from "@/types/domain";

const articleFilterSchema = z.object({
  q: z.string().trim().optional(),
  hsk: z.coerce.number().int().min(1).max(9).optional(),
  type: z
    .enum(["vocabulary_compare", "grammar_note", "usage_note", "culture", "other"])
    .optional(),
  tag: z.string().trim().min(1).optional(),
});

function takeFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function optionalQueryValue(value: string | string[] | undefined) {
  const resolved = takeFirst(value)?.trim();
  return resolved ? resolved : undefined;
}

export function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export interface ArticleFilters {
  q?: string;
  hsk?: number;
  type?: LearningArticleType;
  tag?: string;
}

export interface PublicArticleTag {
  id: string;
  name: string;
  slug: string;
}

export interface PublicArticleListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  hskLevel: number | null;
  articleType: LearningArticleType;
  articleTypeLabel: string;
  publishedAt: string | null;
  tags: PublicArticleTag[];
}

export interface PublicArticleDetail extends PublicArticleListItem {
  contentMarkdown: string;
  relatedWords: Array<{
    id: string;
    slug: string;
    hanzi: string;
    pinyin: string;
    vietnameseMeaning: string;
  }>;
  relatedGrammarPoints: Array<{
    id: string;
    slug: string;
    title: string;
    structureText: string;
    hskLevel: number;
  }>;
}

export interface PublicArticleFilterOptions {
  tags: PublicArticleTag[];
}

export function parseArticleFilters(searchParams: Record<string, string | string[] | undefined>) {
  return articleFilterSchema.parse({
    q: optionalQueryValue(searchParams.q),
    hsk: optionalQueryValue(searchParams.hsk),
    type: optionalQueryValue(searchParams.type),
    tag: optionalQueryValue(searchParams.tag),
  });
}

export function mapArticleListItem(row: {
  id: string;
  title: string;
  slug: string;
  summary: string;
  hsk_level: number | null;
  article_type: LearningArticleType;
  published_at: string | null;
}): PublicArticleListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    hskLevel: row.hsk_level,
    articleType: row.article_type,
    articleTypeLabel: getLearningArticleTypeLabel(row.article_type),
    publishedAt: row.published_at,
    tags: [],
  };
}
