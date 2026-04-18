"use server";

import { z } from "zod";

import {
  examplesToTextarea,
  optionalText,
  parseExamplesTextarea,
  requiredText,
  requireAdminSupabase,
  revalidateAdminPaths,
  redirectTo,
} from "@/features/admin/shared";
import { buildWordContentHash } from "@/features/vocabulary-sync/content-hash";
import { logger } from "@/lib/logger";

const wordSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1, "Slug is required."),
  simplified: z.string().min(1, "Simplified Chinese is required."),
  traditional: z.string().nullable(),
  hanzi: z.string().min(1, "Hanzi is required."),
  pinyin: z.string().min(1, "Pinyin is required."),
  hanViet: z.string().nullable(),
  vietnameseMeaning: z.string().min(1, "Vietnamese meaning is required."),
  englishMeaning: z.string().nullable(),
  hskLevel: z.number().int().min(1).max(9),
  topicId: z.string().uuid().nullable(),
  radicalId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  isPublished: z.boolean(),
});

export interface AdminWordListItem {
  id: string;
  slug: string;
  hanzi: string;
  pinyin: string;
  vietnamese_meaning: string;
  hsk_level: number;
  is_published: boolean;
  updated_at: string;
}

export interface AdminWordEditor {
  word: {
    id: string;
    slug: string;
    simplified: string;
    traditional: string | null;
    hanzi: string;
    pinyin: string;
    han_viet: string | null;
    vietnamese_meaning: string;
    english_meaning: string | null;
    hsk_level: number;
    topic_id: string | null;
    radical_id: string | null;
    external_source: string | null;
    external_id: string | null;
    source_row_key: string | null;
    normalized_text: string | null;
    meanings_vi: string | null;
    traditional_variant: string | null;
    part_of_speech: string | null;
    component_breakdown_json: unknown;
    radical_summary: string | null;
    mnemonic: string | null;
    character_structure_type: string | null;
    structure_explanation: string | null;
    notes: string | null;
    ambiguity_flag: boolean;
    ambiguity_note: string | null;
    reading_candidates: string | null;
    review_status: "pending" | "needs_review" | "approved" | "rejected" | "applied";
    ai_status: "pending" | "processing" | "done" | "failed" | "skipped";
    source_confidence: "low" | "medium" | "high" | null;
    content_hash: string | null;
    last_synced_at: string | null;
    last_source_updated_at: string | null;
    is_published: boolean;
  };
  examplesText: string;
}

export interface AdminSelectOption {
  id: string;
  label: string;
}

export async function listWords(): Promise<AdminWordListItem[]> {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("words")
    .select("id, slug, hanzi, pinyin, vietnamese_meaning, hsk_level, is_published, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getWordEditor(id: string): Promise<AdminWordEditor | null> {
  const { supabase } = await requireAdminSupabase();
  const { data: word, error: wordError } = await supabase
    .from("words")
    .select("id, slug, simplified, traditional, hanzi, pinyin, han_viet, vietnamese_meaning, english_meaning, hsk_level, topic_id, radical_id, external_source, external_id, source_row_key, normalized_text, meanings_vi, traditional_variant, part_of_speech, component_breakdown_json, radical_summary, mnemonic, character_structure_type, structure_explanation, notes, ambiguity_flag, ambiguity_note, reading_candidates, review_status, ai_status, source_confidence, content_hash, last_synced_at, last_source_updated_at, is_published")
    .eq("id", id)
    .maybeSingle();

  if (wordError) throw wordError;
  if (!word) return null;

  const { data: examples, error: examplesError } = await supabase
    .from("word_examples")
    .select("chinese_text, pinyin, vietnamese_meaning, sort_order")
    .eq("word_id", id)
    .order("sort_order");

  if (examplesError) throw examplesError;

  return {
    word,
    examplesText: examplesToTextarea(
      (examples ?? []).map((example) => ({
        chineseText: example.chinese_text,
        pinyin: example.pinyin,
        vietnameseMeaning: example.vietnamese_meaning,
      })),
    ),
  };
}

export async function listWordFormOptions(): Promise<{
  topics: AdminSelectOption[];
  radicals: AdminSelectOption[];
}> {
  const { supabase } = await requireAdminSupabase();
  const [{ data: topics, error: topicsError }, { data: radicals, error: radicalsError }] =
    await Promise.all([
      supabase.from("topics").select("id, name").order("name"),
      supabase.from("radicals").select("id, radical, meaning_vi").order("radical"),
    ]);

  if (topicsError) throw topicsError;
  if (radicalsError) throw radicalsError;

  return {
    topics: (topics ?? []).map((topic) => ({ id: topic.id, label: topic.name })),
    radicals: (radicals ?? []).map((radical) => ({
      id: radical.id,
      label: `${radical.radical} - ${radical.meaning_vi}`,
    })),
  };
}

export async function saveWordAction(formData: FormData) {
  const { supabase, auth } = await requireAdminSupabase();
  const parsed = wordSchema.parse({
    id: optionalText(formData.get("id")) ?? undefined,
    slug: requiredText(formData.get("slug")),
    simplified: requiredText(formData.get("simplified")),
    traditional: optionalText(formData.get("traditional")),
    hanzi: requiredText(formData.get("hanzi")) || requiredText(formData.get("simplified")),
    pinyin: requiredText(formData.get("pinyin")),
    hanViet: optionalText(formData.get("han_viet")),
    vietnameseMeaning: requiredText(formData.get("vietnamese_meaning")),
    englishMeaning: optionalText(formData.get("english_meaning")),
    hskLevel: Number(requiredText(formData.get("hsk_level"))),
    topicId: optionalText(formData.get("topic_id")),
    radicalId: optionalText(formData.get("radical_id")),
    notes: optionalText(formData.get("notes")),
    isPublished: formData.get("is_published") === "on",
  });

  const payload = {
    slug: parsed.slug,
    simplified: parsed.simplified,
    traditional: parsed.traditional,
    hanzi: parsed.hanzi,
    pinyin: parsed.pinyin,
    han_viet: parsed.hanViet,
    vietnamese_meaning: parsed.vietnameseMeaning,
    english_meaning: parsed.englishMeaning,
    normalized_text: parsed.simplified,
    meanings_vi: parsed.vietnameseMeaning,
    traditional_variant: parsed.traditional,
    hsk_level: parsed.hskLevel,
    topic_id: parsed.topicId,
    radical_id: parsed.radicalId,
    review_status: "approved" as const,
    ai_status: "done" as const,
    source_confidence: "high" as const,
    notes: parsed.notes,
    content_hash: buildWordContentHash({
      normalizedText: parsed.simplified,
      pinyin: parsed.pinyin,
      meaningsVi: parsed.vietnameseMeaning,
      hanViet: parsed.hanViet,
      traditionalVariant: parsed.traditional,
      hskLevel: parsed.hskLevel,
      partOfSpeech: null,
      componentBreakdownJson: null,
      radicalSummary: null,
      mnemonic: null,
      characterStructureType: null,
      structureExplanation: null,
      notes: parsed.notes,
      ambiguityFlag: false,
      ambiguityNote: null,
      readingCandidates: null,
    }),
    is_published: parsed.isPublished,
  };

  let wordId = parsed.id;

  if (wordId) {
    const { error } = await supabase.from("words").update(payload).eq("id", wordId);
    if (error) throw error;
    logger.info("admin_word_updated", {
      userId: auth.user?.id ?? null,
      wordId,
      slug: parsed.slug,
      published: parsed.isPublished,
    });
  } else {
    const { data, error } = await supabase
      .from("words")
      .insert({
        ...payload,
        created_by: auth.user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) throw error;
    wordId = data.id;
    logger.info("admin_word_created", {
      userId: auth.user?.id ?? null,
      wordId,
      slug: parsed.slug,
      published: parsed.isPublished,
    });
  }

  const examples = parseExamplesTextarea(formData.get("examples_text"));
  const { error: deleteError } = await supabase.from("word_examples").delete().eq("word_id", wordId);
  if (deleteError) throw deleteError;

  if (examples.length > 0) {
    const { error: insertExamplesError } = await supabase.from("word_examples").insert(
      examples.map((example) => ({
        word_id: wordId,
        chinese_text: example.chineseText,
        pinyin: example.pinyin,
        vietnamese_meaning: example.vietnameseMeaning,
        sort_order: example.sortOrder,
      })),
    );

    if (insertExamplesError) throw insertExamplesError;
  }

  revalidateAdminPaths(["/admin", "/admin/words", `/admin/words/${wordId}/edit`]);
  redirectTo("/admin/words");
}

export async function deleteWordAction(formData: FormData) {
  const { supabase, auth } = await requireAdminSupabase();
  const id = requiredText(formData.get("id"));
  const { error } = await supabase.from("words").delete().eq("id", id);

  if (error) throw error;

  logger.info("admin_word_deleted", {
    userId: auth.user?.id ?? null,
    wordId: id,
  });

  revalidateAdminPaths(["/admin", "/admin/words"]);
  redirectTo("/admin/words");
}
