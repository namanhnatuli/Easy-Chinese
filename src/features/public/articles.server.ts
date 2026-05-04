import { createSupabaseServerClient } from "@/lib/supabase/server";

import type {
  ArticleFilters,
  PublicArticleDetail,
  PublicArticleFilterOptions,
  PublicArticleListItem,
  PublicArticleTag,
} from "./articles";
import { mapArticleListItem, normalizeRelation } from "./articles";

async function findArticleIdsByTagSlug(tagSlug: string) {
  const supabase = await createSupabaseServerClient();
  const { data: tag, error: tagError } = await supabase
    .from("learning_article_tags")
    .select("id")
    .eq("slug", tagSlug)
    .maybeSingle();

  if (tagError) {
    throw tagError;
  }

  if (!tag) {
    return [];
  }

  const { data, error } = await supabase
    .from("learning_article_tag_links")
    .select("article_id")
    .eq("tag_id", tag.id);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.article_id);
}

async function listArticleTags(articleIds: string[]) {
  if (articleIds.length === 0) {
    return new Map<string, PublicArticleTag[]>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("learning_article_tag_links")
    .select("article_id, learning_article_tags(id, name, slug)")
    .in("article_id", articleIds);

  if (error) {
    throw error;
  }

  const grouped = new Map<string, PublicArticleTag[]>();

  for (const row of (data ?? []) as Array<{
    article_id: string;
    learning_article_tags:
      | { id: string; name: string; slug: string }
      | Array<{ id: string; name: string; slug: string }>
      | null;
  }>) {
    const tag = normalizeRelation(row.learning_article_tags);
    if (!tag) {
      continue;
    }

    const current = grouped.get(row.article_id) ?? [];
    current.push(tag);
    grouped.set(row.article_id, current);
  }

  return grouped;
}

export async function listPublicArticles(filters: ArticleFilters): Promise<PublicArticleListItem[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("learning_articles")
    .select("id, title, slug, summary, hsk_level, article_type, published_at")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (filters.hsk) {
    query = query.eq("hsk_level", filters.hsk);
  }

  if (filters.type) {
    query = query.eq("article_type", filters.type);
  }

  if (filters.q) {
    const escaped = filters.q.replace(/[%_]/g, "");
    query = query.or(`title.ilike.%${escaped}%,summary.ilike.%${escaped}%`);
  }

  if (filters.tag) {
    const articleIds = await findArticleIdsByTagSlug(filters.tag);
    if (articleIds.length === 0) {
      return [];
    }
    query = query.in("id", articleIds);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const items = (data ?? []).map(mapArticleListItem);
  const tagsByArticleId = await listArticleTags(items.map((item) => item.id));

  return items.map((item) => ({
    ...item,
    tags: tagsByArticleId.get(item.id) ?? [],
  }));
}

export async function listPublicArticleFilterOptions(): Promise<PublicArticleFilterOptions> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("learning_article_tag_links")
    .select("learning_article_tags!inner(id, name, slug)");

  if (error) {
    throw error;
  }

  const tagMap = new Map<string, PublicArticleTag>();

  for (const row of (data ?? []) as Array<{
    learning_article_tags:
      | { id: string; name: string; slug: string }
      | Array<{ id: string; name: string; slug: string }>
      | null;
  }>) {
    const tag = normalizeRelation(row.learning_article_tags);
    if (!tag) {
      continue;
    }

    tagMap.set(tag.id, tag);
  }

  return {
    tags: Array.from(tagMap.values()).sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export async function getPublicArticleBySlug(slug: string): Promise<PublicArticleDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: article, error } = await supabase
    .from("learning_articles")
    .select("id, title, slug, summary, content_markdown, hsk_level, article_type, published_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!article) {
    return null;
  }

  const [tagsByArticleId, wordLinks, grammarLinks] = await Promise.all([
    listArticleTags([article.id]),
    supabase
      .from("learning_article_words")
      .select("sort_order, words!inner(id, slug, hanzi, pinyin, vietnamese_meaning, is_published)")
      .eq("article_id", article.id)
      .order("sort_order"),
    supabase
      .from("learning_article_grammar_points")
      .select("sort_order, grammar_points!inner(id, slug, title, structure_text, hsk_level, is_published)")
      .eq("article_id", article.id)
      .order("sort_order"),
  ]);

  if (wordLinks.error) {
    throw wordLinks.error;
  }

  if (grammarLinks.error) {
    throw grammarLinks.error;
  }

  return {
    ...mapArticleListItem(article),
    contentMarkdown: article.content_markdown,
    tags: tagsByArticleId.get(article.id) ?? [],
    relatedWords: (wordLinks.data ?? [])
      .map((row) => normalizeRelation(row.words))
      .filter(
        (word): word is {
          id: string;
          slug: string;
          hanzi: string;
          pinyin: string;
          vietnamese_meaning: string;
          is_published: boolean;
        } => Boolean(word),
      )
      .map((word) => ({
        id: word.id,
        slug: word.slug,
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        vietnameseMeaning: word.vietnamese_meaning,
      })),
    relatedGrammarPoints: (grammarLinks.data ?? [])
      .map((row) => normalizeRelation(row.grammar_points))
      .filter(
        (point): point is {
          id: string;
          slug: string;
          title: string;
          structure_text: string;
          hsk_level: number;
          is_published: boolean;
        } => Boolean(point),
      )
      .map((point) => ({
        id: point.id,
        slug: point.slug,
        title: point.title,
        structureText: point.structure_text,
        hskLevel: point.hsk_level,
      })),
  };
}
