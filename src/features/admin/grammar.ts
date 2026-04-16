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

const grammarSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required."),
  slug: z.string().min(1, "Slug is required."),
  hskLevel: z.number().int().min(1).max(9),
  structureText: z.string().min(1, "Structure text is required."),
  explanationVi: z.string().min(1, "Vietnamese explanation is required."),
  notes: z.string().nullable(),
  isPublished: z.boolean(),
});

export interface AdminGrammarListItem {
  id: string;
  title: string;
  slug: string;
  hsk_level: number;
  is_published: boolean;
  updated_at: string;
}

export interface AdminGrammarEditor {
  grammarPoint: {
    id: string;
    title: string;
    slug: string;
    hsk_level: number;
    structure_text: string;
    explanation_vi: string;
    notes: string | null;
    is_published: boolean;
  };
  examplesText: string;
}

export async function listGrammarPoints(): Promise<AdminGrammarListItem[]> {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("grammar_points")
    .select("id, title, slug, hsk_level, is_published, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getGrammarEditor(id: string): Promise<AdminGrammarEditor | null> {
  const { supabase } = await requireAdminSupabase();
  const { data: grammarPoint, error } = await supabase
    .from("grammar_points")
    .select("id, title, slug, hsk_level, structure_text, explanation_vi, notes, is_published")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!grammarPoint) return null;

  const { data: examples, error: examplesError } = await supabase
    .from("grammar_examples")
    .select("chinese_text, pinyin, vietnamese_meaning, sort_order")
    .eq("grammar_point_id", id)
    .order("sort_order");

  if (examplesError) throw examplesError;

  return {
    grammarPoint,
    examplesText: examplesToTextarea(
      (examples ?? []).map((example) => ({
        chineseText: example.chinese_text,
        pinyin: example.pinyin,
        vietnameseMeaning: example.vietnamese_meaning,
      })),
    ),
  };
}

export async function saveGrammarAction(formData: FormData) {
  const { supabase, auth } = await requireAdminSupabase();
  const parsed = grammarSchema.parse({
    id: optionalText(formData.get("id")) ?? undefined,
    title: requiredText(formData.get("title")),
    slug: requiredText(formData.get("slug")),
    hskLevel: Number(requiredText(formData.get("hsk_level"))),
    structureText: requiredText(formData.get("structure_text")),
    explanationVi: requiredText(formData.get("explanation_vi")),
    notes: optionalText(formData.get("notes")),
    isPublished: formData.get("is_published") === "on",
  });

  const payload = {
    title: parsed.title,
    slug: parsed.slug,
    hsk_level: parsed.hskLevel,
    structure_text: parsed.structureText,
    explanation_vi: parsed.explanationVi,
    notes: parsed.notes,
    is_published: parsed.isPublished,
  };

  let grammarId = parsed.id;

  if (grammarId) {
    const { error } = await supabase.from("grammar_points").update(payload).eq("id", grammarId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("grammar_points")
      .insert({
        ...payload,
        created_by: auth.user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) throw error;
    grammarId = data.id;
  }

  const examples = parseExamplesTextarea(formData.get("examples_text"));
  const { error: deleteError } = await supabase
    .from("grammar_examples")
    .delete()
    .eq("grammar_point_id", grammarId);

  if (deleteError) throw deleteError;

  if (examples.length > 0) {
    const { error: insertExamplesError } = await supabase.from("grammar_examples").insert(
      examples.map((example) => ({
        grammar_point_id: grammarId,
        chinese_text: example.chineseText,
        pinyin: example.pinyin,
        vietnamese_meaning: example.vietnameseMeaning,
        sort_order: example.sortOrder,
      })),
    );

    if (insertExamplesError) throw insertExamplesError;
  }

  revalidateAdminPaths(["/admin", "/admin/grammar", `/admin/grammar/${grammarId}/edit`]);
  redirectTo("/admin/grammar");
}

export async function deleteGrammarAction(formData: FormData) {
  const { supabase } = await requireAdminSupabase();
  const id = requiredText(formData.get("id"));
  const { error } = await supabase.from("grammar_points").delete().eq("id", id);

  if (error) throw error;

  revalidateAdminPaths(["/admin", "/admin/grammar"]);
  redirectTo("/admin/grammar");
}
