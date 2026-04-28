"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  buildLessonGeneratorPreview,
  lessonGeneratorInputSchema,
  type GeneratedLessonCandidate,
  type LessonGeneratorInput,
  type LessonGeneratorWord,
} from "@/features/admin/lesson-generator-core";
import { splitPipeDelimited } from "@/features/admin/content-sync-utils";
import {
  booleanFromFormData,
  numberFromFormData,
  optionalText,
  requiredText,
} from "@/features/admin/shared-utils";
import { requireAdminSupabase, revalidateAdminPaths } from "@/features/admin/shared";

export type { GeneratedLessonCandidate, LessonGeneratorInput } from "@/features/admin/lesson-generator-core";

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export interface LessonGeneratorTagOption {
  id: string;
  slug: string;
  label: string;
}

export interface LessonGeneratorCoverageSummary {
  totalEligibleWords: number;
  wordsWithoutLessons: number;
  wordsUsedInMultipleLessons: number;
  coverageByHsk: Array<{
    hskLevel: number;
    totalWords: number;
    usedWords: number;
    unusedWords: number;
  }>;
  coverageByTag: Array<{
    slug: string;
    label: string;
    totalWords: number;
    usedWords: number;
  }>;
}

export interface LessonGeneratorPreviewData {
  input: LessonGeneratorInput;
  title: string;
  slug: string;
  summary: string;
  selectedWords: GeneratedLessonCandidate[];
  replacementWords: GeneratedLessonCandidate[];
  averageDifficultyScore: number;
  topicTagLabels: string[];
}

const lessonGeneratorQuerySchema = z.object({
  hsk: z.coerce.number().int().min(1).max(9),
  topic_tags: z.string().optional(),
  target_count: z.coerce.number().int().min(5).max(30).default(18),
  exclude_published: z
    .union([z.literal("on"), z.literal("true"), z.literal("1"), z.undefined()])
    .transform((value) => value === "on" || value === "true" || value === "1"),
  include_unapproved: z
    .union([z.literal("on"), z.literal("true"), z.literal("1"), z.undefined()])
    .transform((value) => value === "on" || value === "true" || value === "1"),
  allow_reused: z
    .union([z.literal("on"), z.literal("true"), z.literal("1"), z.undefined()])
    .transform((value) => value === "on" || value === "true" || value === "1"),
});

const generatedLessonSaveSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().min(1),
  hskLevel: z.number().int().min(1).max(9),
  topicTagSlugs: z.array(z.string().trim().min(1)).default([]),
  targetWordCount: z.number().int().min(5).max(30),
  excludePublishedLessonWords: z.boolean(),
  includeUnapprovedWords: z.boolean(),
  allowReusedWords: z.boolean(),
  selectedWords: z
    .array(
      z.object({
        wordId: z.string().uuid(),
        slug: z.string().min(1),
        hanzi: z.string().min(1),
        pinyin: z.string().min(1),
        vietnameseMeaning: z.string().min(1),
        difficultyScore: z.number(),
        relevanceScore: z.number(),
        selectionReason: z.string().min(1),
        isNewWord: z.boolean(),
      }),
    )
    .min(1)
    .max(30),
});

function buildLessonGeneratorPath(params: {
  hskLevel?: number | null;
  topicTagSlugs?: string[];
  targetWordCount?: number | null;
  excludePublishedLessonWords?: boolean;
  includeUnapprovedWords?: boolean;
  allowReusedWords?: boolean;
}) {
  const searchParams = new URLSearchParams();

  if (params.hskLevel) {
    searchParams.set("hsk", String(params.hskLevel));
  }

  if (params.topicTagSlugs && params.topicTagSlugs.length > 0) {
    searchParams.set("topic_tags", params.topicTagSlugs.join(" | "));
  }

  if (params.targetWordCount) {
    searchParams.set("target_count", String(params.targetWordCount));
  }

  if (params.excludePublishedLessonWords) {
    searchParams.set("exclude_published", "on");
  }

  if (params.includeUnapprovedWords) {
    searchParams.set("include_unapproved", "on");
  }

  if (params.allowReusedWords) {
    searchParams.set("allow_reused", "on");
  }

  const query = searchParams.toString();
  return query ? `/admin/lesson-generator?${query}` : "/admin/lesson-generator";
}

function buildGeneratedLessonTitle(input: {
  hskLevel: number;
  tagLabels: string[];
  wordCount: number;
}) {
  if (input.tagLabels.length === 0) {
    return `HSK ${input.hskLevel} vocabulary lesson`;
  }

  if (input.tagLabels.length === 1) {
    return `HSK ${input.hskLevel} ${input.tagLabels[0]} vocabulary lesson`;
  }

  const head = input.tagLabels.slice(0, 2).join(" and ");
  return `HSK ${input.hskLevel} ${head} vocabulary lesson`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildGeneratedLessonSummary(input: {
  hskLevel: number;
  tagLabels: string[];
  wordCount: number;
}) {
  const topicSummary =
    input.tagLabels.length === 0
      ? "a mixed-study focus"
      : input.tagLabels.length === 1
        ? input.tagLabels[0]
        : input.tagLabels.join(", ");

  return `Draft auto-generated HSK ${input.hskLevel} lesson with ${input.wordCount} words focused on ${topicSummary}, ordered from easier to harder review.`;
}

function estimateLessonMinutes(wordCount: number) {
  return Math.max(10, Math.ceil(wordCount * 0.8));
}

async function ensureUniqueLessonSlug(baseSlug: string) {
  const { supabase } = await requireAdminSupabase();
  const normalizedBase = baseSlug || "generated-lesson";
  const { data, error } = await supabase
    .from("lessons")
    .select("slug")
    .ilike("slug", `${normalizedBase}%`);

  if (error) {
    throw error;
  }

  const existing = new Set((data ?? []).map((item) => item.slug));
  if (!existing.has(normalizedBase)) {
    return normalizedBase;
  }

  let suffix = 2;
  while (existing.has(`${normalizedBase}-${suffix}`)) {
    suffix += 1;
  }

  return `${normalizedBase}-${suffix}`;
}

async function listWordTagsByWordId(wordIds: string[]) {
  if (wordIds.length === 0) {
    return new Map<string, { slug: string; label: string }[]>();
  }

  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("word_tag_links")
    .select("word_id, word_tags!inner(slug, label)")
    .in("word_id", wordIds);

  if (error) {
    throw error;
  }

  const tagsByWordId = new Map<string, { slug: string; label: string }[]>();

  for (const row of (data ?? []) as Array<{
    word_id: string;
    word_tags: { slug: string; label: string } | Array<{ slug: string; label: string }> | null;
  }>) {
    const tag = normalizeRelation(row.word_tags);
    if (!tag) {
      continue;
    }

    const current = tagsByWordId.get(row.word_id) ?? [];
    current.push(tag);
    tagsByWordId.set(row.word_id, current);
  }

  return tagsByWordId;
}

async function listWordRadicalsByWordId(wordIds: string[]) {
  if (wordIds.length === 0) {
    return new Map<string, string[]>();
  }

  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("word_radicals")
    .select("word_id, radicals!inner(radical)")
    .in("word_id", wordIds);

  if (error) {
    throw error;
  }

  const radicalsByWordId = new Map<string, string[]>();

  for (const row of (data ?? []) as Array<{
    word_id: string;
    radicals: { radical: string } | Array<{ radical: string }> | null;
  }>) {
    const radical = normalizeRelation(row.radicals);
    if (!radical) {
      continue;
    }

    const current = radicalsByWordId.get(row.word_id) ?? [];
    current.push(radical.radical);
    radicalsByWordId.set(row.word_id, current);
  }

  return radicalsByWordId;
}

async function listLessonMembershipsByWordId(wordIds: string[]) {
  if (wordIds.length === 0) {
    return new Map<string, LessonGeneratorWord["lessonMemberships"]>();
  }

  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("lesson_words")
    .select("word_id, lessons!inner(id, title, slug, is_published)")
    .in("word_id", wordIds);

  if (error) {
    throw error;
  }

  const membershipsByWordId = new Map<string, LessonGeneratorWord["lessonMemberships"]>();

  for (const row of (data ?? []) as Array<{
    word_id: string;
    lessons:
      | { id: string; title: string; slug: string; is_published: boolean }
      | Array<{ id: string; title: string; slug: string; is_published: boolean }>
      | null;
  }>) {
    const lesson = normalizeRelation(row.lessons);
    if (!lesson) {
      continue;
    }

    const current = membershipsByWordId.get(row.word_id) ?? [];
    current.push({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonSlug: lesson.slug,
      isPublished: lesson.is_published,
    });
    membershipsByWordId.set(row.word_id, current);
  }

  return membershipsByWordId;
}

async function listGeneratorWords(input: LessonGeneratorInput): Promise<LessonGeneratorWord[]> {
  const { supabase } = await requireAdminSupabase();
  let query = supabase
    .from("words")
    .select(
      "id, slug, hanzi, pinyin, vietnamese_meaning, normalized_text, meanings_vi, hsk_level, part_of_speech, component_breakdown_json, ambiguity_flag, source_confidence, review_status, is_published",
    )
    .eq("hsk_level", input.hskLevel)
    .neq("review_status", "rejected")
    .order("hanzi")
    .order("pinyin");

  if (!input.includeUnapprovedWords) {
    query = query.eq("is_published", true).eq("review_status", "approved");
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const wordIds = (data ?? []).map((word) => word.id);
  const [tagsByWordId, radicalsByWordId, membershipsByWordId] = await Promise.all([
    listWordTagsByWordId(wordIds),
    listWordRadicalsByWordId(wordIds),
    listLessonMembershipsByWordId(wordIds),
  ]);

  return (data ?? []).map((word) => ({
    id: word.id,
    slug: word.slug,
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    vietnameseMeaning: word.vietnamese_meaning,
    normalizedText: word.normalized_text,
    meaningsVi: word.meanings_vi,
    hskLevel: word.hsk_level,
    partOfSpeech: word.part_of_speech,
    componentBreakdownJson: word.component_breakdown_json,
    ambiguityFlag: word.ambiguity_flag,
    sourceConfidence: word.source_confidence,
    reviewStatus: word.review_status,
    isPublished: word.is_published,
    tagSlugs: (tagsByWordId.get(word.id) ?? []).map((tag) => tag.slug),
    radicalTokens: radicalsByWordId.get(word.id) ?? [],
    componentTokens: [],
    lessonMemberships: membershipsByWordId.get(word.id) ?? [],
  }));
}

export async function listLessonGeneratorTagOptions(): Promise<LessonGeneratorTagOption[]> {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase.from("word_tags").select("id, slug, label").order("label");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export function parseLessonGeneratorInput(
  searchParams: Record<string, string | string[] | undefined>,
): LessonGeneratorInput | null {
  const normalized = {
    hsk: Array.isArray(searchParams.hsk) ? searchParams.hsk[0] : searchParams.hsk,
    topic_tags: Array.isArray(searchParams.topic_tags) ? searchParams.topic_tags[0] : searchParams.topic_tags,
    target_count: Array.isArray(searchParams.target_count) ? searchParams.target_count[0] : searchParams.target_count,
    exclude_published: Array.isArray(searchParams.exclude_published)
      ? searchParams.exclude_published[0]
      : searchParams.exclude_published,
    include_unapproved: Array.isArray(searchParams.include_unapproved)
      ? searchParams.include_unapproved[0]
      : searchParams.include_unapproved,
    allow_reused: Array.isArray(searchParams.allow_reused)
      ? searchParams.allow_reused[0]
      : searchParams.allow_reused,
  };

  if (!normalized.hsk) {
    return null;
  }

  const parsed = lessonGeneratorQuerySchema.parse(normalized);
  return lessonGeneratorInputSchema.parse({
    hskLevel: parsed.hsk,
    topicTagSlugs: splitPipeDelimited(parsed.topic_tags ?? null),
    targetWordCount: parsed.target_count,
    excludePublishedLessonWords: parsed.exclude_published,
    includeUnapprovedWords: parsed.include_unapproved,
    allowReusedWords: parsed.allow_reused,
  });
}

export async function generateLessonPreview(
  input: LessonGeneratorInput,
): Promise<LessonGeneratorPreviewData> {
  const [tagOptions, words] = await Promise.all([
    listLessonGeneratorTagOptions(),
    listGeneratorWords(input),
  ]);

  const preview = buildLessonGeneratorPreview(words, input);
  const selectedTagLabels = tagOptions
    .filter((tag) => input.topicTagSlugs.includes(tag.slug))
    .map((tag) => tag.label);
  const title = buildGeneratedLessonTitle({
    hskLevel: input.hskLevel,
    tagLabels: selectedTagLabels,
    wordCount: preview.selectedWords.length,
  });

  return {
    input,
    title,
    slug: await ensureUniqueLessonSlug(slugify(title)),
    summary: buildGeneratedLessonSummary({
      hskLevel: input.hskLevel,
      tagLabels: selectedTagLabels,
      wordCount: preview.selectedWords.length,
    }),
    selectedWords: preview.selectedWords,
    replacementWords: preview.replacementWords,
    averageDifficultyScore: preview.averageDifficultyScore,
    topicTagLabels: selectedTagLabels,
  };
}

export async function getLessonGenerationCoverageSummary(): Promise<LessonGeneratorCoverageSummary> {
  const { supabase } = await requireAdminSupabase();
  const [{ data: words, error: wordsError }, { data: lessonWordLinks, error: lessonWordError }] =
    await Promise.all([
      supabase.from("words").select("id, hsk_level, review_status, is_published").neq("review_status", "rejected"),
      supabase.from("lesson_words").select("word_id"),
    ]);

  if (wordsError) {
    throw wordsError;
  }

  if (lessonWordError) {
    throw lessonWordError;
  }

  const eligibleWords = (words ?? []).filter((word) => word.is_published || word.review_status === "approved");
  const usageCountByWordId = new Map<string, number>();
  for (const row of lessonWordLinks ?? []) {
    usageCountByWordId.set(row.word_id, (usageCountByWordId.get(row.word_id) ?? 0) + 1);
  }

  const wordIds = eligibleWords.map((word) => word.id);
  const tagsByWordId = await listWordTagsByWordId(wordIds);
  const tagStats = new Map<string, { slug: string; label: string; totalWords: number; usedWords: number }>();
  const coverageByHsk = new Map<number, { totalWords: number; usedWords: number }>();

  for (const word of eligibleWords) {
    const usageCount = usageCountByWordId.get(word.id) ?? 0;
    const hskLevel = word.hsk_level;
    const hskEntry = coverageByHsk.get(hskLevel) ?? { totalWords: 0, usedWords: 0 };
    hskEntry.totalWords += 1;
    if (usageCount > 0) {
      hskEntry.usedWords += 1;
    }
    coverageByHsk.set(hskLevel, hskEntry);

    for (const tag of tagsByWordId.get(word.id) ?? []) {
      const current = tagStats.get(tag.slug) ?? {
        slug: tag.slug,
        label: tag.label,
        totalWords: 0,
        usedWords: 0,
      };
      current.totalWords += 1;
      if (usageCount > 0) {
        current.usedWords += 1;
      }
      tagStats.set(tag.slug, current);
    }
  }

  return {
    totalEligibleWords: eligibleWords.length,
    wordsWithoutLessons: eligibleWords.filter((word) => (usageCountByWordId.get(word.id) ?? 0) === 0).length,
    wordsUsedInMultipleLessons: eligibleWords.filter((word) => (usageCountByWordId.get(word.id) ?? 0) > 1).length,
    coverageByHsk: Array.from(coverageByHsk.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([hskLevel, stats]) => ({
        hskLevel,
        totalWords: stats.totalWords,
        usedWords: stats.usedWords,
        unusedWords: stats.totalWords - stats.usedWords,
      })),
    coverageByTag: Array.from(tagStats.values())
      .sort((left, right) => right.totalWords - left.totalWords || left.label.localeCompare(right.label))
      .slice(0, 8),
  };
}

export async function saveGeneratedLessonDraftAction(formData: FormData) {
  const { supabase, auth } = await requireAdminSupabase();
  const parsed = generatedLessonSaveSchema.parse({
    title: requiredText(formData.get("title")),
    slug: requiredText(formData.get("slug")),
    summary: requiredText(formData.get("summary")),
    hskLevel: numberFromFormData(formData.get("hsk_level")),
    topicTagSlugs: splitPipeDelimited(optionalText(formData.get("topic_tag_slugs"))),
    targetWordCount: numberFromFormData(formData.get("target_word_count")),
    excludePublishedLessonWords: booleanFromFormData(formData.get("exclude_published_lesson_words")),
    includeUnapprovedWords: booleanFromFormData(formData.get("include_unapproved_words")),
    allowReusedWords: booleanFromFormData(formData.get("allow_reused_words")),
    selectedWords: JSON.parse(requiredText(formData.get("selected_words_json"))),
  });

  const requestedInput = lessonGeneratorInputSchema.parse({
    hskLevel: parsed.hskLevel,
    topicTagSlugs: parsed.topicTagSlugs,
    targetWordCount: parsed.targetWordCount,
    excludePublishedLessonWords: parsed.excludePublishedLessonWords,
    includeUnapprovedWords: parsed.includeUnapprovedWords,
    allowReusedWords: parsed.allowReusedWords,
  });

  const eligibleWords = await listGeneratorWords(requestedInput);
  const eligiblePreview = buildLessonGeneratorPreview(eligibleWords, requestedInput);
  const eligibleCandidates = [...eligiblePreview.selectedWords, ...eligiblePreview.replacementWords];
  const candidateByWordId = new Map(eligibleCandidates.map((word) => [word.wordId, word] as const));

  const uniqueWordIds = new Set(parsed.selectedWords.map((word) => word.wordId));
  if (uniqueWordIds.size !== parsed.selectedWords.length) {
    throw new Error("Generated lesson contains duplicate word IDs.");
  }

  const resolvedSelectedWords = parsed.selectedWords.map((word) => {
    const candidate = candidateByWordId.get(word.wordId);
    if (!candidate) {
      throw new Error("Generated lesson contains a word that no longer matches the requested lesson filters.");
    }

    return candidate;
  });

  const safeSlug = await ensureUniqueLessonSlug(slugify(parsed.slug));
  const averageDifficulty =
    resolvedSelectedWords.reduce((total, word) => total + word.difficultyScore, 0) / resolvedSelectedWords.length;

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .insert({
      title: parsed.title,
      slug: safeSlug,
      description: parsed.summary,
      hsk_level: parsed.hskLevel,
      is_published: false,
      sort_order: 0,
      generation_source: "auto",
      generation_config: {
        targetWordCount: parsed.targetWordCount,
        excludePublishedLessonWords: parsed.excludePublishedLessonWords,
        includeUnapprovedWords: parsed.includeUnapprovedWords,
        allowReusedWords: parsed.allowReusedWords,
      },
      difficulty_level: Number(averageDifficulty.toFixed(2)),
      topic_tag_slugs: parsed.topicTagSlugs,
      estimated_minutes: estimateLessonMinutes(resolvedSelectedWords.length),
      word_count: resolvedSelectedWords.length,
      created_by: auth.user?.id ?? null,
    })
    .select("id")
    .single();

  if (lessonError) {
    throw lessonError;
  }

  const lessonId = lesson.id;

  const { error: lessonWordsError } = await supabase.from("lesson_words").insert(
    resolvedSelectedWords.map((word, index) => ({
      lesson_id: lessonId,
      word_id: word.wordId,
      sort_order: index + 1,
      difficulty_score: word.difficultyScore,
      relevance_score: word.relevanceScore,
      selection_reason: word.selectionReason,
      is_new_word: word.isNewWord,
    })),
  );

  if (lessonWordsError) {
    throw lessonWordsError;
  }

  const { data: run, error: runError } = await supabase
    .from("lesson_generation_runs")
    .insert({
      requested_by: auth.user?.id ?? null,
      hsk_level: parsed.hskLevel,
      topic_tag_slugs: parsed.topicTagSlugs,
      target_word_count: parsed.targetWordCount,
      exclude_published_lesson_words: parsed.excludePublishedLessonWords,
      include_unapproved_words: parsed.includeUnapprovedWords,
      allow_reused_words: parsed.allowReusedWords,
      generated_title: parsed.title,
      generated_slug: safeSlug,
      generated_summary: parsed.summary,
      generated_word_count: resolvedSelectedWords.length,
      saved_lesson_id: lessonId,
    })
    .select("id")
    .single();

  if (runError) {
    throw runError;
  }

  const membershipsByWordId = await listLessonMembershipsByWordId(resolvedSelectedWords.map((word) => word.wordId));

  const { error: candidateError } = await supabase.from("lesson_generation_candidates").insert(
    resolvedSelectedWords.map((word, index) => {
      const lessonMemberships = membershipsByWordId.get(word.wordId) ?? [];
      return {
        run_id: run.id,
        word_id: word.wordId,
        sort_order: index + 1,
        selected: true,
        difficulty_score: word.difficultyScore,
        relevance_score: word.relevanceScore,
        selection_reason: word.selectionReason,
        lesson_usage_count: lessonMemberships.length,
        published_lesson_usage_count: lessonMemberships.filter((lessonMembership) => lessonMembership.isPublished).length,
      };
    }),
  );

  if (candidateError) {
    throw candidateError;
  }

  revalidateAdminPaths([
    "/admin",
    "/admin/lessons",
    "/admin/lesson-generator",
    "/admin/words",
    `/admin/lessons/${lessonId}/edit`,
  ]);

  redirect(`/admin/lessons/${lessonId}/edit`);
}

export async function regenerateLessonPreviewAction(formData: FormData) {
  const parsed = lessonGeneratorInputSchema.parse({
    hskLevel: numberFromFormData(formData.get("hsk_level")),
    topicTagSlugs: splitPipeDelimited(optionalText(formData.get("topic_tag_slugs"))),
    targetWordCount: numberFromFormData(formData.get("target_word_count")) ?? 18,
    excludePublishedLessonWords: booleanFromFormData(formData.get("exclude_published_lesson_words")),
    includeUnapprovedWords: booleanFromFormData(formData.get("include_unapproved_words")),
    allowReusedWords: booleanFromFormData(formData.get("allow_reused_words")),
  });

  redirect(buildLessonGeneratorPath(parsed));
}
