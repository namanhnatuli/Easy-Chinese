import { getLearningArticleTypeLabel } from "@/features/articles/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ArticleAiContext, GrammarAiContext, WordAiContext } from "@/features/ai/types";

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function getWordAiContext(
  wordId: string,
  options: { senseId?: string | null } = {},
): Promise<WordAiContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: word, error } = await supabase
    .from("words")
    .select(
      "id, slug, hanzi, pinyin, vietnamese_meaning, hsk_level, part_of_speech, notes, meanings_vi, topic_id, word_examples(chinese_text, pinyin, vietnamese_meaning, sort_order, sense_id)",
    )
    .eq("id", wordId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!word) {
    return null;
  }

  let selectedSense: {
    id: string;
    pinyin: string;
    part_of_speech: string | null;
    meaning_vi: string;
    usage_note: string | null;
  } | null = null;

  if (options.senseId) {
    const { data: sense, error: senseError } = await supabase
      .from("word_senses")
      .select("id, pinyin, part_of_speech, meaning_vi, usage_note")
      .eq("word_id", word.id)
      .eq("id", options.senseId)
      .eq("is_published", true)
      .maybeSingle();

    if (senseError) {
      throw senseError;
    }

    if (!sense) {
      return null;
    }

    selectedSense = sense;
  }

  const { data: similarRows, error: similarError } = await supabase
    .from("words")
    .select("hanzi, pinyin, vietnamese_meaning")
    .eq("is_published", true)
    .eq("hsk_level", word.hsk_level)
    .neq("id", word.id)
    .limit(3);

  if (similarError) {
    throw similarError;
  }

  return {
    id: word.id,
    senseId: selectedSense?.id ?? null,
    slug: word.slug,
    hanzi: word.hanzi,
    pinyin: selectedSense?.pinyin ?? word.pinyin,
    vietnameseMeaning: selectedSense?.meaning_vi ?? word.vietnamese_meaning,
    hskLevel: word.hsk_level,
    partOfSpeech: selectedSense?.part_of_speech ?? word.part_of_speech,
    notes: selectedSense?.usage_note ?? word.notes,
    meaningsVi: selectedSense?.meaning_vi ?? word.meanings_vi,
    examples: (word.word_examples ?? [])
      .filter((example) => !selectedSense || example.sense_id === selectedSense.id)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((example) => ({
        chineseText: example.chinese_text,
        pinyin: example.pinyin,
        vietnameseMeaning: example.vietnamese_meaning,
      })),
    similarWords: (similarRows ?? []).map((item) => ({
      hanzi: item.hanzi,
      pinyin: item.pinyin,
      vietnameseMeaning: item.vietnamese_meaning,
    })),
  };
}

export async function getGrammarAiContext(grammarId: string): Promise<GrammarAiContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: grammar, error } = await supabase
    .from("grammar_points")
    .select(
      "id, slug, title, structure_text, explanation_vi, hsk_level, notes, grammar_examples(chinese_text, pinyin, vietnamese_meaning, sort_order)",
    )
    .eq("id", grammarId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!grammar) {
    return null;
  }

  return {
    id: grammar.id,
    slug: grammar.slug,
    title: grammar.title,
    structureText: grammar.structure_text,
    explanationVi: grammar.explanation_vi,
    hskLevel: grammar.hsk_level,
    notes: grammar.notes,
    examples: (grammar.grammar_examples ?? [])
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((example) => ({
        chineseText: example.chinese_text,
        pinyin: example.pinyin,
        vietnameseMeaning: example.vietnamese_meaning,
      })),
  };
}

export async function getArticleAiContext(articleId: string): Promise<ArticleAiContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: article, error } = await supabase
    .from("learning_articles")
    .select("id, slug, title, summary, hsk_level, article_type")
    .eq("id", articleId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!article) {
    return null;
  }

  const { data: relatedWords, error: wordsError } = await supabase
    .from("learning_article_words")
    .select("words!inner(hanzi, pinyin, vietnamese_meaning, is_published)")
    .eq("article_id", article.id)
    .eq("words.is_published", true)
    .limit(5);

  if (wordsError) {
    throw wordsError;
  }

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    hskLevel: article.hsk_level,
    articleTypeLabel: getLearningArticleTypeLabel(article.article_type),
    relatedWords: (relatedWords ?? [])
      .map((row) => normalizeRelation(row.words))
      .filter((word) => Boolean(word))
      .map((word) => ({
        hanzi: word!.hanzi,
        pinyin: word!.pinyin,
        vietnameseMeaning: word!.vietnamese_meaning,
      })),
  };
}
