"use server";

import { z } from "zod";

import {
  optionalText,
  requiredText,
} from "@/features/admin/shared-utils";
import { splitPipeDelimited } from "@/features/admin/content-sync-utils";
import { requireAdminSupabase, revalidateAdminPaths, redirectTo } from "@/features/admin/shared";
import type { LearningArticleType } from "@/types/domain";

const articleSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required."),
  slug: z.string().min(1, "Slug is required."),
  summary: z.string().min(1, "Summary is required."),
  contentMarkdown: z.string().min(1, "Content is required."),
  hskLevel: z.number().int().min(1).max(9).nullable(),
  articleType: z.enum(["vocabulary_compare", "grammar_note", "usage_note", "culture", "other"]),
  isPublished: z.boolean(),
  tagIds: z.array(z.string().uuid()).default([]),
  relatedWordIds: z.array(z.string().uuid()).default([]),
  relatedGrammarPointIds: z.array(z.string().uuid()).default([]),
});

export interface ArticleOption {
  id: string;
  label: string;
}

export interface AdminArticleListItem {
  id: string;
  title: string;
  slug: string;
  article_type: LearningArticleType;
  hsk_level: number | null;
  is_published: boolean;
  updated_at: string;
  published_at: string | null;
}

export interface AdminArticleEditor {
  article: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    content_markdown: string;
    hsk_level: number | null;
    article_type: LearningArticleType;
    is_published: boolean;
    published_at: string | null;
  };
  tagIds: string[];
  relatedWordIds: string[];
  relatedGrammarPointIds: string[];
}

export async function listAdminArticles(): Promise<AdminArticleListItem[]> {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("learning_articles")
    .select("id, title, slug, article_type, hsk_level, is_published, updated_at, published_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listLearningArticleFormOptions(): Promise<{
  tags: ArticleOption[];
  words: ArticleOption[];
  grammarPoints: ArticleOption[];
}> {
  const { supabase } = await requireAdminSupabase();
  const [
    { data: tags, error: tagsError },
    { data: words, error: wordsError },
    { data: grammarPoints, error: grammarError },
  ] = await Promise.all([
    supabase.from("learning_article_tags").select("id, name").order("name"),
    supabase.from("words").select("id, hanzi, pinyin, vietnamese_meaning").order("hanzi"),
    supabase.from("grammar_points").select("id, title, hsk_level").order("title"),
  ]);

  if (tagsError) throw tagsError;
  if (wordsError) throw wordsError;
  if (grammarError) throw grammarError;

  return {
    tags: (tags ?? []).map((tag) => ({ id: tag.id, label: tag.name })),
    words: (words ?? []).map((word) => ({
      id: word.id,
      label: `${word.hanzi} · ${word.pinyin} · ${word.vietnamese_meaning}`,
    })),
    grammarPoints: (grammarPoints ?? []).map((point) => ({
      id: point.id,
      label: `${point.title} · HSK ${point.hsk_level}`,
    })),
  };
}

export async function getLearningArticleEditor(id: string): Promise<AdminArticleEditor | null> {
  const { supabase } = await requireAdminSupabase();
  const { data: article, error } = await supabase
    .from("learning_articles")
    .select("id, title, slug, summary, content_markdown, hsk_level, article_type, is_published, published_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!article) {
    return null;
  }

  const [tagLinks, wordLinks, grammarLinks] = await Promise.all([
    supabase.from("learning_article_tag_links").select("tag_id").eq("article_id", id),
    supabase.from("learning_article_words").select("word_id").eq("article_id", id).order("sort_order"),
    supabase
      .from("learning_article_grammar_points")
      .select("grammar_point_id")
      .eq("article_id", id)
      .order("sort_order"),
  ]);

  if (tagLinks.error) throw tagLinks.error;
  if (wordLinks.error) throw wordLinks.error;
  if (grammarLinks.error) throw grammarLinks.error;

  return {
    article,
    tagIds: (tagLinks.data ?? []).map((row) => row.tag_id),
    relatedWordIds: (wordLinks.data ?? []).map((row) => row.word_id),
    relatedGrammarPointIds: (grammarLinks.data ?? []).map((row) => row.grammar_point_id),
  };
}

export async function saveLearningArticleAction(formData: FormData) {
  const { supabase, auth } = await requireAdminSupabase();
  const isPublished = formData.get("is_published") === "on";
  const parsed = articleSchema.parse({
    id: optionalText(formData.get("id")) ?? undefined,
    title: requiredText(formData.get("title")),
    slug: requiredText(formData.get("slug")),
    summary: requiredText(formData.get("summary")),
    contentMarkdown: requiredText(formData.get("content_markdown")),
    hskLevel: optionalText(formData.get("hsk_level"))
      ? Number(requiredText(formData.get("hsk_level")))
      : null,
    articleType: requiredText(formData.get("article_type")),
    isPublished,
    tagIds: splitPipeDelimited(optionalText(formData.get("tag_ids"))),
    relatedWordIds: splitPipeDelimited(optionalText(formData.get("related_word_ids"))),
    relatedGrammarPointIds: splitPipeDelimited(optionalText(formData.get("related_grammar_point_ids"))),
  });

  const payload = {
    title: parsed.title,
    slug: parsed.slug,
    summary: parsed.summary,
    content_markdown: parsed.contentMarkdown,
    hsk_level: parsed.hskLevel,
    article_type: parsed.articleType,
    is_published: parsed.isPublished,
    published_at: parsed.isPublished ? new Date().toISOString() : null,
  };

  let articleId = parsed.id;

  if (articleId) {
    const { error } = await supabase.from("learning_articles").update(payload).eq("id", articleId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("learning_articles")
      .insert({
        ...payload,
        created_by: auth.user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) throw error;
    articleId = data.id;
  }

  const [
    deleteTagsResult,
    deleteWordsResult,
    deleteGrammarResult,
  ] = await Promise.all([
    supabase.from("learning_article_tag_links").delete().eq("article_id", articleId),
    supabase.from("learning_article_words").delete().eq("article_id", articleId),
    supabase.from("learning_article_grammar_points").delete().eq("article_id", articleId),
  ]);

  if (deleteTagsResult.error) throw deleteTagsResult.error;
  if (deleteWordsResult.error) throw deleteWordsResult.error;
  if (deleteGrammarResult.error) throw deleteGrammarResult.error;

  if (parsed.tagIds.length > 0) {
    const { error } = await supabase.from("learning_article_tag_links").insert(
      parsed.tagIds.map((tagId) => ({
        article_id: articleId,
        tag_id: tagId,
      })),
    );
    if (error) throw error;
  }

  if (parsed.relatedWordIds.length > 0) {
    const { error } = await supabase.from("learning_article_words").insert(
      parsed.relatedWordIds.map((wordId, index) => ({
        article_id: articleId,
        word_id: wordId,
        sort_order: index + 1,
      })),
    );
    if (error) throw error;
  }

  if (parsed.relatedGrammarPointIds.length > 0) {
    const { error } = await supabase.from("learning_article_grammar_points").insert(
      parsed.relatedGrammarPointIds.map((grammarPointId, index) => ({
        article_id: articleId,
        grammar_point_id: grammarPointId,
        sort_order: index + 1,
      })),
    );
    if (error) throw error;
  }

  revalidateAdminPaths([
    "/admin",
    "/admin/articles",
    `/admin/articles/${articleId}/edit`,
    "/articles",
    `/articles/${parsed.slug}`,
    "/dashboard",
  ]);
  redirectTo("/admin/articles");
}

export async function deleteLearningArticleAction(formData: FormData) {
  const { supabase } = await requireAdminSupabase();
  const id = requiredText(formData.get("id"));

  const { error } = await supabase.from("learning_articles").delete().eq("id", id);
  if (error) {
    throw error;
  }

  revalidateAdminPaths(["/admin", "/admin/articles", "/articles", "/dashboard"]);
  redirectTo("/admin/articles");
}
