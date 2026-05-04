import { createSupabaseServerClient } from "@/lib/supabase/server";

import type {
  GrammarFilters,
  PublicGrammarDetail,
  PublicGrammarListItem,
} from "./grammar";
import { mapGrammarPoint } from "./grammar";

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
