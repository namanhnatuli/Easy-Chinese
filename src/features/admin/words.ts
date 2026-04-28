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
import { splitPipeDelimited } from "@/features/admin/content-sync-utils";
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
  normalizedText: z.string().min(1, "Normalized text is required."),
  meaningsVi: z.string().min(1, "Vietnamese meanings are required."),
  traditionalVariant: z.string().nullable(),
  hskLevel: z.number().int().min(1).max(9),
  topicId: z.string().uuid().nullable(),
  radicalIds: z.array(z.string().uuid()).default([]),
  topicTags: z.array(z.string().min(1)).default([]),
  partOfSpeech: z.string().nullable(),
  componentBreakdownJson: z.string().nullable(),
  radicalSummary: z.string().nullable(),
  mnemonic: z.string().nullable(),
  characterStructureType: z.string().nullable(),
  structureExplanation: z.string().nullable(),
  notes: z.string().nullable(),
  ambiguityFlag: z.boolean(),
  ambiguityNote: z.string().nullable(),
  readingCandidates: z.string().nullable(),
  aiStatus: z.enum(["pending", "processing", "done", "failed", "skipped"]),
  sourceConfidence: z.enum(["low", "medium", "high"]).nullable(),
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
  lessonCount: number;
  lessonLinks: Array<{
    lessonId: string;
    lessonTitle: string;
    lessonSlug: string;
    isPublished: boolean;
  }>;
}

export interface AdminWordListPage {
  items: AdminWordListItem[];
  totalItems: number;
  page: number;
  pageSize: number;
  pageCount: number;
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
    radical_ids: string[];
    topic_tags: string[];
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

export async function listWordsPage(input: {
  page: number;
  pageSize: number;
}): Promise<AdminWordListPage> {
  const { supabase } = await requireAdminSupabase();
  const requestedPage = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize =
    Number.isFinite(input.pageSize) && input.pageSize > 0 ? Math.floor(input.pageSize) : 10;
  const { count, error: countError } = await supabase
    .from("words")
    .select("id", {
      count: "exact",
      head: true,
    });

  if (countError) throw countError;

  const totalItems = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from("words")
    .select("id, slug, hanzi, pinyin, vietnamese_meaning, hsk_level, is_published, updated_at")
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const wordIds = (data ?? []).map((word) => word.id);
  const lessonLinksByWordId = new Map<
    string,
    Array<{
      lessonId: string;
      lessonTitle: string;
      lessonSlug: string;
      isPublished: boolean;
    }>
  >();

  if (wordIds.length > 0) {
    const { data: lessonLinks, error: lessonLinksError } = await supabase
      .from("lesson_words")
      .select("word_id, lessons!inner(id, title, slug, is_published)")
      .in("word_id", wordIds);

    if (lessonLinksError) {
      throw lessonLinksError;
    }

    for (const row of (lessonLinks ?? []) as Array<{
      word_id: string;
      lessons:
        | { id: string; title: string; slug: string; is_published: boolean }
        | Array<{ id: string; title: string; slug: string; is_published: boolean }>
        | null;
    }>) {
      const lesson = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons;
      if (!lesson) {
        continue;
      }

      const current = lessonLinksByWordId.get(row.word_id) ?? [];
      current.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonSlug: lesson.slug,
        isPublished: lesson.is_published,
      });
      lessonLinksByWordId.set(row.word_id, current);
    }
  }

  return {
    items:
      (data ?? []).map((word) => {
        const lessonLinks = lessonLinksByWordId.get(word.id) ?? [];
        return {
          ...word,
          lessonCount: lessonLinks.length,
          lessonLinks,
        };
      }) ?? [],
    totalItems,
    page,
    pageSize,
    pageCount,
  };
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

  const { data: radicalLinks, error: radicalLinksError } = await supabase
    .from("word_radicals")
    .select("radical_id, is_main, sort_order")
    .eq("word_id", id)
    .order("sort_order");

  if (radicalLinksError) throw radicalLinksError;

  const radicalIds =
    radicalLinks?.map((link) => link.radical_id).filter((value): value is string => Boolean(value)) ?? [];

  const { data: tagLinks, error: tagLinksError } = await supabase
    .from("word_tag_links")
    .select("word_tags(slug)")
    .eq("word_id", id);

  if (tagLinksError) throw tagLinksError;

  const topicTags =
    (tagLinks ?? [])
      .map((tagLink) => {
        const relation = tagLink.word_tags as { slug: string } | Array<{ slug: string }> | null;
        return Array.isArray(relation) ? relation[0]?.slug : relation?.slug;
      })
      .filter((value): value is string => Boolean(value)) ?? [];

  return {
    word: {
      ...word,
      radical_ids:
        radicalIds.length > 0
          ? radicalIds
          : word.radical_id
            ? [word.radical_id]
            : [],
      topic_tags: topicTags,
    },
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
    normalizedText: requiredText(formData.get("normalized_text")),
    meaningsVi: requiredText(formData.get("meanings_vi")),
    traditionalVariant: optionalText(formData.get("traditional_variant")),
    hskLevel: Number(requiredText(formData.get("hsk_level"))),
    topicId: optionalText(formData.get("topic_id")),
    radicalIds: splitPipeDelimited(optionalText(formData.get("radical_ids"))),
    topicTags: splitPipeDelimited(optionalText(formData.get("topic_tags"))),
    partOfSpeech: optionalText(formData.get("part_of_speech")),
    componentBreakdownJson: optionalText(formData.get("component_breakdown_json")),
    radicalSummary: optionalText(formData.get("radical_summary")),
    mnemonic: optionalText(formData.get("mnemonic")),
    characterStructureType: optionalText(formData.get("character_structure_type")),
    structureExplanation: optionalText(formData.get("structure_explanation")),
    notes: optionalText(formData.get("notes")),
    ambiguityFlag: formData.get("ambiguity_flag") === "on",
    ambiguityNote: optionalText(formData.get("ambiguity_note")),
    readingCandidates: optionalText(formData.get("reading_candidates")),
    aiStatus:
      optionalText(formData.get("ai_status")) as
        | "pending"
        | "processing"
        | "done"
        | "failed"
        | "skipped"
        | null,
    sourceConfidence:
      (optionalText(formData.get("source_confidence")) as "low" | "medium" | "high" | null) ?? null,
    isPublished: formData.get("is_published") === "on",
  });

  let componentBreakdownJson: unknown = null;
  if (parsed.componentBreakdownJson) {
    try {
      componentBreakdownJson = JSON.parse(parsed.componentBreakdownJson);
    } catch {
      throw new Error("Component breakdown JSON must be valid JSON.");
    }
  }

  const primaryRadicalId = parsed.radicalIds[0] ?? null;

  const payload = {
    slug: parsed.slug,
    simplified: parsed.simplified,
    traditional: parsed.traditional,
    hanzi: parsed.hanzi,
    pinyin: parsed.pinyin,
    han_viet: parsed.hanViet,
    vietnamese_meaning: parsed.vietnameseMeaning,
    english_meaning: parsed.englishMeaning,
    normalized_text: parsed.normalizedText,
    meanings_vi: parsed.meaningsVi,
    traditional_variant: parsed.traditionalVariant,
    hsk_level: parsed.hskLevel,
    topic_id: parsed.topicId,
    radical_id: primaryRadicalId,
    review_status: "approved" as const,
    ai_status: parsed.aiStatus,
    source_confidence: parsed.sourceConfidence,
    part_of_speech: parsed.partOfSpeech,
    component_breakdown_json: componentBreakdownJson,
    radical_summary: parsed.radicalSummary,
    mnemonic: parsed.mnemonic,
    character_structure_type: parsed.characterStructureType,
    structure_explanation: parsed.structureExplanation,
    notes: parsed.notes,
    ambiguity_flag: parsed.ambiguityFlag,
    ambiguity_note: parsed.ambiguityNote,
    reading_candidates: parsed.readingCandidates,
    content_hash: buildWordContentHash({
      normalizedText: parsed.normalizedText,
      pinyin: parsed.pinyin,
      meaningsVi: parsed.meaningsVi,
      hanViet: parsed.hanViet,
      traditionalVariant: parsed.traditionalVariant,
      hskLevel: parsed.hskLevel,
      partOfSpeech: parsed.partOfSpeech,
      componentBreakdownJson,
      radicalSummary: parsed.radicalSummary,
      mnemonic: parsed.mnemonic,
      characterStructureType: parsed.characterStructureType,
      structureExplanation: parsed.structureExplanation,
      notes: parsed.notes,
      ambiguityFlag: parsed.ambiguityFlag,
      ambiguityNote: parsed.ambiguityNote,
      readingCandidates: parsed.readingCandidates,
      mainRadicals: parsed.radicalIds,
      topicTags: parsed.topicTags,
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

  const { error: deleteRadicalsError } = await supabase.from("word_radicals").delete().eq("word_id", wordId);
  if (deleteRadicalsError) throw deleteRadicalsError;

  if (parsed.radicalIds.length > 0) {
    const { error: insertRadicalsError } = await supabase.from("word_radicals").insert(
      parsed.radicalIds.map((radicalId, index) => ({
        word_id: wordId,
        radical_id: radicalId,
        is_main: index === 0,
        sort_order: index,
      })),
    );

    if (insertRadicalsError) throw insertRadicalsError;
  }

  if (parsed.topicTags.length > 0) {
    const { error: upsertTagsError } = await supabase.from("word_tags").upsert(
      parsed.topicTags.map((slug) => ({
        slug,
        label: slug
          .split(/[_-]+/)
          .filter(Boolean)
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(" "),
      })),
      { onConflict: "slug" },
    );

    if (upsertTagsError) throw upsertTagsError;
  }

  const { error: deleteTagLinksError } = await supabase.from("word_tag_links").delete().eq("word_id", wordId);
  if (deleteTagLinksError) throw deleteTagLinksError;

  if (parsed.topicTags.length > 0) {
    const { data: wordTags, error: selectWordTagsError } = await supabase
      .from("word_tags")
      .select("id, slug")
      .in("slug", parsed.topicTags);

    if (selectWordTagsError) throw selectWordTagsError;

    const tagIdBySlug = new Map((wordTags ?? []).map((tag) => [tag.slug, tag.id]));
    const missingTags = parsed.topicTags.filter((slug) => !tagIdBySlug.has(slug));
    if (missingTags.length > 0) {
      throw new Error(`Missing topic tags after upsert: ${missingTags.join(", ")}`);
    }

    const { error: insertTagLinksError } = await supabase.from("word_tag_links").insert(
      parsed.topicTags.map((slug) => ({
        word_id: wordId,
        word_tag_id: tagIdBySlug.get(slug) as string,
      })),
    );

    if (insertTagLinksError) throw insertTagLinksError;
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
