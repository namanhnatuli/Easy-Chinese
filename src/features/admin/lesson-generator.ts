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
  const CHUNK_SIZE = 100;
  let allData: any[] = [];
  
  for (let i = 0; i < wordIds.length; i += CHUNK_SIZE) {
    const chunk = wordIds.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from("word_tag_links")
      .select("word_id, word_tags!inner(slug, label)")
      .in("word_id", chunk);

    if (error) {
      throw error;
    }
    
    if (data) {
      allData = allData.concat(data);
    }
  }

  const tagsByWordId = new Map<string, { slug: string; label: string }[]>();

  for (const row of allData as Array<{
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
  const CHUNK_SIZE = 100;
  let allData: any[] = [];

  for (let i = 0; i < wordIds.length; i += CHUNK_SIZE) {
    const chunk = wordIds.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from("word_radicals")
      .select("word_id, radicals!inner(radical)")
      .in("word_id", chunk);

    if (error) {
      throw error;
    }
    
    if (data) {
      allData = allData.concat(data);
    }
  }

  const radicalsByWordId = new Map<string, string[]>();

  for (const row of allData as Array<{
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
  const CHUNK_SIZE = 100;
  let allData: any[] = [];

  for (let i = 0; i < wordIds.length; i += CHUNK_SIZE) {
    const chunk = wordIds.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from("lesson_words")
      .select("word_id, lessons!inner(id, title, slug, is_published)")
      .in("word_id", chunk);

    if (error) {
      throw error;
    }
    
    if (data) {
      allData = allData.concat(data);
    }
  }

  const membershipsByWordId = new Map<string, LessonGeneratorWord["lessonMemberships"]>();

  for (const row of allData as Array<{
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
    query = query.or("is_published.eq.true,review_status.eq.approved");
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

export async function parseLessonGeneratorInput(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<LessonGeneratorInput | null> {
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

  // 1. Get total eligible words count
  const { count: totalEligibleCount, error: totalError } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true })
    .neq("review_status", "rejected")
    .or("is_published.eq.true,review_status.eq.approved");

  if (totalError) throw totalError;

  // 2. Get words without lessons (unused)
  // Logic: words that are NOT in lesson_words table
  // Since we can't do complex NOT IN in PostgREST easily for large sets, 
  // we use the fact that we only need the count.
  // We'll fetch all used word IDs from lesson_words (might be > 1000)
  
  let allUsedWordIds = new Set<string>();
  let hasMore = true;
  let offset = 0;
  const LIMIT = 1000;

  while (hasMore) {
    const { data: usedBatch, error: usedError } = await supabase
      .from("lesson_words")
      .select("word_id")
      .range(offset, offset + LIMIT - 1);

    if (usedError) throw usedError;
    if (!usedBatch || usedBatch.length === 0) {
      hasMore = false;
    } else {
      usedBatch.forEach(row => allUsedWordIds.add(row.word_id));
      offset += LIMIT;
      if (usedBatch.length < LIMIT) hasMore = false;
    }
  }

  // 3. To get accurate coverage by HSK and Tag, we actually DO need to iterate or do multiple counts.
  // Given the rule "No SQL logic", we fetch the essential fields for all eligible words.
  // We'll fetch in batches to avoid the 1000 limit.
  
  const eligibleWords: Array<{ id: string; hsk_level: number }> = [];
  offset = 0;
  hasMore = true;
  while (hasMore) {
    const { data: wordBatch, error: wordError } = await supabase
      .from("words")
      .select("id, hsk_level")
      .neq("review_status", "rejected")
      .or("is_published.eq.true,review_status.eq.approved")
      .range(offset, offset + LIMIT - 1);

    if (wordError) throw wordError;
    if (!wordBatch || wordBatch.length === 0) {
      hasMore = false;
    } else {
      eligibleWords.push(...wordBatch);
      offset += LIMIT;
      if (wordBatch.length < LIMIT) hasMore = false;
    }
  }

  // 4. Calculate stats from memory (now we have ALL eligible words)
  const usageCountByWordId = new Map<string, number>();
  // We already have allUsedWordIds set, but we might want frequency for "multiple lessons"
  // Let's re-count if we need frequency.
  // Actually, for multiple lessons, we need the full list.
  
  const frequencyMap = new Map<string, number>();
  // We can't re-fetch everything efficiently if it's huge, 
  // but let's assume lesson_words is manageable for now or we fetch it properly.
  // Optimization: use the already fetched allUsedWordIds for "without lessons"
  
  // To find "multiple lessons", we need to fetch lesson_words count per word.
  // Let's fetch the counts grouped by word_id if possible, or just re-process.
  // Re-processing the allData from step 2 (if we kept it)
  // Let's refine step 2 to keep counts.
  const wordFrequencyMap = new Map<string, number>();
  offset = 0;
  hasMore = true;
  while (hasMore) {
    const { data: linkBatch, error: linkError } = await supabase
      .from("lesson_words")
      .select("word_id")
      .range(offset, offset + LIMIT - 1);
    if (linkError) throw linkError;
    if (!linkBatch || linkBatch.length === 0) {
      hasMore = false;
    } else {
      linkBatch.forEach(row => {
        wordFrequencyMap.set(row.word_id, (wordFrequencyMap.get(row.word_id) ?? 0) + 1);
      });
      offset += LIMIT;
      if (linkBatch.length < LIMIT) hasMore = false;
    }
  }

  const coverageByHsk = new Map<number, { totalWords: number; usedWords: number }>();
  const wordsWithoutLessons = eligibleWords.filter(w => !wordFrequencyMap.has(w.id)).length;
  const wordsUsedInMultipleLessons = eligibleWords.filter(w => (wordFrequencyMap.get(w.id) ?? 0) > 1).length;

  for (const word of eligibleWords) {
    const hsk = word.hsk_level;
    const stats = coverageByHsk.get(hsk) ?? { totalWords: 0, usedWords: 0 };
    stats.totalWords += 1;
    if (wordFrequencyMap.has(word.id)) {
      stats.usedWords += 1;
    }
    coverageByHsk.set(hsk, stats);
  }

  // 5. Coverage by Tag
  // This is expensive because of the many-to-many.
  // We'll fetch all tag links for eligible words.
  const wordIds = eligibleWords.map(w => w.id);
  const tagsByWordId = await listWordTagsByWordId(wordIds);
  const tagStats = new Map<string, { slug: string; label: string; totalWords: number; usedWords: number }>();

  for (const word of eligibleWords) {
    const tags = tagsByWordId.get(word.id) ?? [];
    const isUsed = wordFrequencyMap.has(word.id);
    for (const tag of tags) {
      const stats = tagStats.get(tag.slug) ?? { slug: tag.slug, label: tag.label, totalWords: 0, usedWords: 0 };
      stats.totalWords += 1;
      if (isUsed) {
        stats.usedWords += 1;
      }
      tagStats.set(tag.slug, stats);
    }
  }

  return {
    totalEligibleWords: totalEligibleCount ?? eligibleWords.length,
    wordsWithoutLessons,
    wordsUsedInMultipleLessons,
    coverageByHsk: Array.from(coverageByHsk.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hskLevel, stats]) => ({
        hskLevel,
        totalWords: stats.totalWords,
        usedWords: stats.usedWords,
        unusedWords: stats.totalWords - stats.usedWords,
      })),
    coverageByTag: Array.from(tagStats.values())
      .sort((a, b) => b.totalWords - a.totalWords || a.label.localeCompare(b.label))
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
