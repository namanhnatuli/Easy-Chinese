import { createSupabaseServerClient } from "@/lib/supabase/server";

import type {
  LessonFilters,
  PublicLessonDetail,
  PublicLessonGrammarPoint,
  PublicLessonListItem,
  PublicLessonWord,
} from "./lessons";
import { normalizeRelation } from "./lessons";

export async function listLessonTopics() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("topics").select("id, name, slug").order("name");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listPublicLessons(filters: LessonFilters): Promise<PublicLessonListItem[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("lessons")
    .select(
      "id, title, slug, description, hsk_level, sort_order, topics(id, name, slug), lesson_words(word_id), lesson_grammar_points(grammar_point_id)",
    )
    .eq("is_published", true)
    .order("sort_order")
    .order("title");

  if (filters.hsk) {
    query = query.eq("hsk_level", filters.hsk);
  }

  if (filters.topic) {
    query = query.eq("topics.slug", filters.topic);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((lesson) => {
    const topic = normalizeRelation(lesson.topics);

    return {
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description,
      hskLevel: lesson.hsk_level,
      sortOrder: lesson.sort_order,
      topic: topic
        ? {
            id: topic.id,
            name: topic.name,
            slug: topic.slug,
          }
        : null,
      wordCount: lesson.lesson_words?.length ?? 0,
      grammarCount: lesson.lesson_grammar_points?.length ?? 0,
    };
  });
}

async function getLessonBaseByColumn(
  column: "slug" | "id",
  value: string,
): Promise<{
  id: string;
  title: string;
  slug: string;
  description: string;
  hsk_level: number;
  sort_order: number;
  topics: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
} | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("id, title, slug, description, hsk_level, sort_order, topics(id, name, slug)")
    .eq(column, value)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getLessonComposition(lessonId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: lessonWords, error: lessonWordsError }, { data: lessonGrammar, error: lessonGrammarError }] =
    await Promise.all([
      supabase
        .from("lesson_words")
        .select("sort_order, words(id, slug, simplified, traditional, hanzi, pinyin, han_viet, vietnamese_meaning, notes, mnemonic, word_examples(id, chinese_text, pinyin, vietnamese_meaning))")
        .eq("lesson_id", lessonId)
        .order("sort_order"),
      supabase
        .from("lesson_grammar_points")
        .select("sort_order, grammar_points(id, slug, title, structure_text, explanation_vi)")
        .eq("lesson_id", lessonId)
        .order("sort_order"),
    ]);

  if (lessonWordsError) {
    throw lessonWordsError;
  }

  if (lessonGrammarError) {
    throw lessonGrammarError;
  }

  return {
    words: (lessonWords ?? [])
      .map((item) => {
        const word = normalizeRelation(item.words);
        if (!word) {
          return null;
        }

        return {
          id: word.id,
          slug: word.slug,
          simplified: word.simplified,
          traditional: word.traditional,
          hanzi: word.hanzi,
          pinyin: word.pinyin,
          hanViet: word.han_viet,
          vietnameseMeaning: word.vietnamese_meaning,
          sortOrder: item.sort_order,
          notes: word.notes,
          mnemonic: word.mnemonic,
          examples: (word.word_examples ?? []).map((ex: any) => ({
            id: ex.id,
            chineseText: ex.chinese_text,
            pinyin: ex.pinyin,
            vietnameseMeaning: ex.vietnamese_meaning,
          })),
        } satisfies PublicLessonWord;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    grammarPoints: (lessonGrammar ?? [])
      .map((item) => {
        const point = normalizeRelation(item.grammar_points);
        if (!point) {
          return null;
        }

        return {
          id: point.id,
          slug: point.slug,
          title: point.title,
          structureText: point.structure_text,
          explanationVi: point.explanation_vi,
          sortOrder: item.sort_order,
        } satisfies PublicLessonGrammarPoint;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  };
}

function mapLessonDetail(
  lesson: {
    id: string;
    title: string;
    slug: string;
    description: string;
    hsk_level: number;
    sort_order: number;
    topics: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
  },
  composition: {
    words: PublicLessonWord[];
    grammarPoints: PublicLessonGrammarPoint[];
  },
): PublicLessonDetail {
  const topic = normalizeRelation(lesson.topics);

  return {
    id: lesson.id,
    title: lesson.title,
    slug: lesson.slug,
    description: lesson.description,
    hskLevel: lesson.hsk_level,
    sortOrder: lesson.sort_order,
    topic: topic
      ? {
          id: topic.id,
          name: topic.name,
          slug: topic.slug,
        }
      : null,
    words: composition.words,
    grammarPoints: composition.grammarPoints,
  };
}

export async function getPublicLessonBySlug(slug: string): Promise<PublicLessonDetail | null> {
  const lesson = await getLessonBaseByColumn("slug", slug);

  if (!lesson) {
    return null;
  }

  const composition = await getLessonComposition(lesson.id);
  return mapLessonDetail(lesson, composition);
}

export async function getPublicLessonById(id: string): Promise<PublicLessonDetail | null> {
  const lesson = await getLessonBaseByColumn("id", id);

  if (!lesson) {
    return null;
  }

  const composition = await getLessonComposition(lesson.id);
  return mapLessonDetail(lesson, composition);
}
