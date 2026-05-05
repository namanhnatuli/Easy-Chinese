import { requireAdminSupabase } from "@/features/admin/shared";
import type { ExistingGrammarSnapshot, NormalizedGrammarExample } from "@/features/grammar-sync/types";

export async function fetchExistingGrammarSnapshots(): Promise<ExistingGrammarSnapshot[]> {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_points")
    .select(
      "id, title, slug, hsk_level, structure_text, explanation_vi, notes, source_confidence, ambiguity_flag, ambiguity_note, review_status, ai_status, source_row_key, content_hash, last_source_updated_at, grammar_examples(chinese_text, pinyin, vietnamese_meaning, sort_order)",
    )
    .order("title");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    structureText: row.structure_text,
    explanationVi: row.explanation_vi,
    notes: row.notes,
    examples: ((row.grammar_examples ?? []) as Array<{
      chinese_text: string;
      pinyin: string | null;
      vietnamese_meaning: string | null;
      sort_order: number;
    }>)
      .map(
        (example): NormalizedGrammarExample => ({
          chineseText: example.chinese_text,
          pinyin: example.pinyin,
          vietnameseMeaning: example.vietnamese_meaning,
          sortOrder: example.sort_order,
        }),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder),
    hskLevel: row.hsk_level,
    sourceConfidence: row.source_confidence,
    ambiguityFlag: row.ambiguity_flag ?? false,
    ambiguityNote: row.ambiguity_note,
    reviewStatus: row.review_status ?? "pending",
    aiStatus: row.ai_status ?? "pending",
    sourceRowKey: row.source_row_key,
    contentHash: row.content_hash,
    lastSourceUpdatedAt: row.last_source_updated_at,
  }));
}
