"use server";

import { z } from "zod";

import {
  optionalText,
  parseOrderedSelections,
  requiredText,
  requireAdminSupabase,
  revalidateAdminPaths,
  redirectTo,
} from "@/features/admin/shared";

const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required."),
  slug: z.string().min(1, "Slug is required."),
  description: z.string().min(1, "Description is required."),
  hskLevel: z.number().int().min(1).max(9),
  topicId: z.string().uuid().nullable(),
  isPublished: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export interface AdminLessonListItem {
  id: string;
  title: string;
  slug: string;
  hsk_level: number;
  is_published: boolean;
  sort_order: number;
  updated_at: string;
}

export interface AdminLessonEditor {
  lesson: {
    id: string;
    title: string;
    slug: string;
    description: string;
    hsk_level: number;
    topic_id: string | null;
    is_published: boolean;
    sort_order: number;
  };
  selectedWordIds: Record<string, number>;
  selectedGrammarIds: Record<string, number>;
}

export interface LessonCompositionOption {
  id: string;
  label: string;
}

export async function listLessons(): Promise<AdminLessonListItem[]> {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("lessons")
    .select("id, title, slug, hsk_level, is_published, sort_order, updated_at")
    .order("sort_order")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getLessonEditor(id: string): Promise<AdminLessonEditor | null> {
  const { supabase } = await requireAdminSupabase();
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id, title, slug, description, hsk_level, topic_id, is_published, sort_order")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!lesson) return null;

  const [{ data: lessonWords, error: wordsError }, { data: lessonGrammar, error: grammarError }] =
    await Promise.all([
      supabase.from("lesson_words").select("word_id, sort_order").eq("lesson_id", id),
      supabase
        .from("lesson_grammar_points")
        .select("grammar_point_id, sort_order")
        .eq("lesson_id", id),
    ]);

  if (wordsError) throw wordsError;
  if (grammarError) throw grammarError;

  return {
    lesson,
    selectedWordIds: Object.fromEntries(
      (lessonWords ?? []).map((item) => [item.word_id, item.sort_order]),
    ),
    selectedGrammarIds: Object.fromEntries(
      (lessonGrammar ?? []).map((item) => [item.grammar_point_id, item.sort_order]),
    ),
  };
}

export async function listLessonFormOptions(): Promise<{
  topics: LessonCompositionOption[];
  words: LessonCompositionOption[];
  grammarPoints: LessonCompositionOption[];
}> {
  const { supabase } = await requireAdminSupabase();
  const [
    { data: topics, error: topicsError },
    { data: words, error: wordsError },
    { data: grammarPoints, error: grammarError },
  ] = await Promise.all([
    supabase.from("topics").select("id, name").order("name"),
    supabase.from("words").select("id, hanzi, pinyin").order("hanzi"),
    supabase.from("grammar_points").select("id, title").order("title"),
  ]);

  if (topicsError) throw topicsError;
  if (wordsError) throw wordsError;
  if (grammarError) throw grammarError;

  return {
    topics: (topics ?? []).map((topic) => ({ id: topic.id, label: topic.name })),
    words: (words ?? []).map((word) => ({ id: word.id, label: `${word.hanzi} - ${word.pinyin}` })),
    grammarPoints: (grammarPoints ?? []).map((point) => ({ id: point.id, label: point.title })),
  };
}

export async function saveLessonAction(formData: FormData) {
  const { supabase, auth } = await requireAdminSupabase();
  const parsed = lessonSchema.parse({
    id: optionalText(formData.get("id")) ?? undefined,
    title: requiredText(formData.get("title")),
    slug: requiredText(formData.get("slug")),
    description: requiredText(formData.get("description")),
    hskLevel: Number(requiredText(formData.get("hsk_level"))),
    topicId: optionalText(formData.get("topic_id")),
    isPublished: formData.get("is_published") === "on",
    sortOrder: Number(requiredText(formData.get("sort_order")) || "0"),
  });

  const payload = {
    title: parsed.title,
    slug: parsed.slug,
    description: parsed.description,
    hsk_level: parsed.hskLevel,
    topic_id: parsed.topicId,
    is_published: parsed.isPublished,
    sort_order: parsed.sortOrder,
  };

  let lessonId = parsed.id;

  if (lessonId) {
    const { error } = await supabase.from("lessons").update(payload).eq("id", lessonId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        ...payload,
        created_by: auth.user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) throw error;
    lessonId = data.id;
  }

  const selectedWords = parseOrderedSelections(formData, "word");
  const selectedGrammar = parseOrderedSelections(formData, "grammar");

  const { error: deleteWordsError } = await supabase
    .from("lesson_words")
    .delete()
    .eq("lesson_id", lessonId);
  if (deleteWordsError) throw deleteWordsError;

  const { error: deleteGrammarError } = await supabase
    .from("lesson_grammar_points")
    .delete()
    .eq("lesson_id", lessonId);
  if (deleteGrammarError) throw deleteGrammarError;

  if (selectedWords.length > 0) {
    const { error } = await supabase.from("lesson_words").insert(
      selectedWords.map((item) => ({
        lesson_id: lessonId,
        word_id: item.id,
        sort_order: item.sortOrder,
      })),
    );

    if (error) throw error;
  }

  if (selectedGrammar.length > 0) {
    const { error } = await supabase.from("lesson_grammar_points").insert(
      selectedGrammar.map((item) => ({
        lesson_id: lessonId,
        grammar_point_id: item.id,
        sort_order: item.sortOrder,
      })),
    );

    if (error) throw error;
  }

  revalidateAdminPaths(["/admin", "/admin/lessons", `/admin/lessons/${lessonId}/edit`]);
  redirectTo("/admin/lessons");
}

export async function deleteLessonAction(formData: FormData) {
  const { supabase } = await requireAdminSupabase();
  const id = requiredText(formData.get("id"));
  const { error } = await supabase.from("lessons").delete().eq("id", id);

  if (error) throw error;

  revalidateAdminPaths(["/admin", "/admin/lessons"]);
  redirectTo("/admin/lessons");
}
