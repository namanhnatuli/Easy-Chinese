import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const grammarFilterSchema = z.object({
  hsk: z.coerce.number().int().min(1).max(9).optional(),
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

export interface GrammarFilters {
  hsk?: number;
}

export interface PublicGrammarListItem {
  id: string;
  title: string;
  slug: string;
  hskLevel: number;
  structureText: string;
  explanationVi: string;
  notes: string | null;
}

export interface PublicGrammarDetail extends PublicGrammarListItem {
  examples: Array<{
    id: string;
    chineseText: string;
    pinyin: string | null;
    vietnameseMeaning: string;
    sortOrder: number;
  }>;
}

export function parseGrammarFilters(searchParams: Record<string, string | string[] | undefined>) {
  return grammarFilterSchema.parse({
    hsk: optionalQueryValue(searchParams.hsk),
  });
}

function mapGrammarPoint(row: {
  id: string;
  title: string;
  slug: string;
  hsk_level: number;
  structure_text: string;
  explanation_vi: string;
  notes: string | null;
}): PublicGrammarListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    hskLevel: row.hsk_level,
    structureText: row.structure_text,
    explanationVi: row.explanation_vi,
    notes: row.notes,
  };
}

export async function listPublicGrammarPoints(filters: GrammarFilters): Promise<PublicGrammarListItem[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("grammar_points")
    .select("id, title, slug, hsk_level, structure_text, explanation_vi, notes")
    .order("hsk_level")
    .order("title");

  if (filters.hsk) {
    query = query.eq("hsk_level", filters.hsk);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapGrammarPoint);
}

export async function getPublicGrammarPointBySlug(slug: string): Promise<PublicGrammarDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: point, error: pointError } = await supabase
    .from("grammar_points")
    .select("id, title, slug, hsk_level, structure_text, explanation_vi, notes")
    .eq("slug", slug)
    .maybeSingle();

  if (pointError) {
    throw pointError;
  }

  if (!point) {
    return null;
  }

  const { data: examples, error: examplesError } = await supabase
    .from("grammar_examples")
    .select("id, chinese_text, pinyin, vietnamese_meaning, sort_order")
    .eq("grammar_point_id", point.id)
    .order("sort_order");

  if (examplesError) {
    throw examplesError;
  }

  return {
    ...mapGrammarPoint(point),
    examples: (examples ?? []).map((example) => ({
      id: example.id,
      chineseText: example.chinese_text,
      pinyin: example.pinyin,
      vietnameseMeaning: example.vietnamese_meaning,
      sortOrder: example.sort_order,
    })),
  };
}
