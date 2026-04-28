import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireAdminSupabase } from "@/features/admin/shared";
import { buildWordSlugBase } from "@/features/vocabulary-sync/apply-slug";
import { resolveEffectiveInputTextForApply } from "@/features/vocabulary-sync/apply-payload";
import { buildWordContentHash } from "@/features/vocabulary-sync/content-hash";
import { resolveVocabSyncMatch } from "@/features/vocabulary-sync/matching";
import {
  buildSourceRowKey,
  type ParsedVocabSyncRow,
} from "@/features/vocabulary-sync/normalize";
import {
  resolveMainRadicalsAgainstAliases,
} from "@/features/vocabulary-sync/radical-alias";
import type { NormalizedVocabSyncPayload } from "@/features/vocabulary-sync/types";
import { getVocabSyncRow, listVocabSyncRowsForBatch, updateVocabSyncRow, listVocabSyncRowsByIds } from "@/features/vocabulary-sync/repository";
import type { VocabSyncRow } from "@/features/vocabulary-sync/types";
import { fetchExistingWordCandidates } from "@/features/vocabulary-sync/word-snapshots";
import { logger } from "@/lib/logger";

const normalizedExampleSchema = z.object({
  chineseText: z.string().trim().min(1),
  pinyin: z.string().trim().nullable(),
  vietnameseMeaning: z.string().trim().min(1),
  sortOrder: z.number().int().positive(),
});

const effectivePayloadSchema = z.object({
  externalId: z.string().trim().nullable().optional(),
  inputText: z.string().trim().nullable().optional(),
  normalizedText: z.string().trim().min(1),
  pinyin: z.string().trim().min(1),
  meaningsVi: z.string().trim().min(1),
  hanViet: z.string().trim().nullable().optional(),
  traditionalVariant: z.string().trim().nullable().optional(),
  mainRadicals: z.array(z.string().trim().min(1)).default([]),
  componentBreakdownJson: z.unknown().nullable().optional(),
  radicalSummary: z.string().trim().nullable().optional(),
  hskLevel: z.number().int().min(1).max(9).nullable().optional(),
  partOfSpeech: z.string().trim().nullable().optional(),
  topicTags: z.array(z.string().trim().min(1)).default([]),
  examples: z.array(normalizedExampleSchema).default([]),
  similarChars: z.array(z.string().trim().min(1)).default([]),
  characterStructureType: z.string().trim().nullable().optional(),
  structureExplanation: z.string().trim().nullable().optional(),
  mnemonic: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  sourceConfidence: z.enum(["low", "medium", "high"]).nullable().optional(),
  ambiguityFlag: z.boolean().default(false),
  ambiguityNote: z.string().trim().nullable().optional(),
  readingCandidates: z.string().trim().nullable().optional(),
  reviewStatus: z.enum(["pending", "needs_review", "approved", "rejected", "applied"]).default("approved"),
  aiStatus: z.enum(["pending", "processing", "done", "failed", "skipped"]).default("pending"),
  sourceUpdatedAt: z.string().trim().nullable().optional(),
});

export interface ApplyVocabSyncRowResult {
  rowId: string;
  batchId: string;
  status: "applied" | "failed" | "skipped";
  operation: "insert" | "update" | "failed" | "skipped";
  wordId: string | null;
  errorMessage: string | null;
}

export interface ApplyVocabSyncRowsResult {
  attempted: number;
  applied: number;
  failed: number;
  skipped: number;
  results: ApplyVocabSyncRowResult[];
}

async function normalizePayloadMainRadicals(payload: NormalizedVocabSyncPayload) {
  if (payload.mainRadicals.length === 0) {
    return payload;
  }

  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("radicals")
    .select("radical, display_label, han_viet_name, meaning_vi, variant_forms");

  if (error) {
    throw error;
  }

  return {
    ...payload,
    mainRadicals: resolveMainRadicalsAgainstAliases(payload.mainRadicals, data ?? []),
  };
}

async function buildUniqueWordSlug(payload: Pick<NormalizedVocabSyncPayload, "normalizedText" | "pinyin">) {
  const { supabase } = await requireAdminSupabase();
  const baseSlug = buildWordSlugBase(payload);
  const { data, error } = await supabase
    .from("words")
    .select("slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) {
    throw error;
  }

  const existingSlugs = new Set((data ?? []).map((row) => row.slug));
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

function getEffectivePayload(row: VocabSyncRow): NormalizedVocabSyncPayload {
  const rawPayload = row.adminEditedPayload ?? row.normalizedPayload;
  const parsed = effectivePayloadSchema.parse(rawPayload);
  const effectiveInputText = resolveEffectiveInputTextForApply({
    inputText: parsed.inputText ?? null,
    normalizedText: parsed.normalizedText,
  });

  return {
    externalId: parsed.externalId ?? row.externalId ?? null,
    inputText: effectiveInputText,
    normalizedText: parsed.normalizedText,
    pinyin: parsed.pinyin,
    meaningsVi: parsed.meaningsVi,
    hanViet: parsed.hanViet ?? null,
    traditionalVariant: parsed.traditionalVariant ?? null,
    mainRadicals: parsed.mainRadicals,
    componentBreakdownJson: parsed.componentBreakdownJson ?? null,
    radicalSummary: parsed.radicalSummary ?? null,
    hskLevel: parsed.hskLevel ?? null,
    partOfSpeech: parsed.partOfSpeech ?? null,
    topicTags: parsed.topicTags,
    examples: parsed.examples,
    similarChars: parsed.similarChars,
    characterStructureType: parsed.characterStructureType ?? null,
    structureExplanation: parsed.structureExplanation ?? null,
    mnemonic: parsed.mnemonic ?? null,
    notes: parsed.notes ?? null,
    sourceConfidence: parsed.sourceConfidence ?? null,
    ambiguityFlag: parsed.ambiguityFlag,
    ambiguityNote: parsed.ambiguityNote ?? null,
    readingCandidates: parsed.readingCandidates ?? null,
    reviewStatus: parsed.reviewStatus,
    aiStatus: parsed.aiStatus,
    sourceUpdatedAt: parsed.sourceUpdatedAt ?? row.sourceUpdatedAt ?? null,
  };
}

function buildParsedRowForApply(row: VocabSyncRow, payload: NormalizedVocabSyncPayload): ParsedVocabSyncRow {
  const contentHash = buildWordContentHash({
    normalizedText: payload.normalizedText ?? "",
    pinyin: payload.pinyin,
    meaningsVi: payload.meaningsVi,
    hanViet: payload.hanViet,
    traditionalVariant: payload.traditionalVariant,
    hskLevel: payload.hskLevel,
    partOfSpeech: payload.partOfSpeech,
    componentBreakdownJson: payload.componentBreakdownJson,
    radicalSummary: payload.radicalSummary,
    mnemonic: payload.mnemonic,
    characterStructureType: payload.characterStructureType,
    structureExplanation: payload.structureExplanation,
    notes: payload.notes,
    ambiguityFlag: payload.ambiguityFlag,
    ambiguityNote: payload.ambiguityNote,
    readingCandidates: payload.readingCandidates,
    mainRadicals: payload.mainRadicals,
    topicTags: payload.topicTags,
    examples: payload.examples,
  });

  return {
    rowNumber: row.sourceRowNumber ?? 0,
    rawPayload: row.rawPayload,
    normalizedPayload: payload,
    sourceRowKey: row.sourceRowKey,
    contentHash,
    parseErrors: [],
    initialChangeClassification: row.changeClassification,
  };
}

function buildExistingWordHash(word: Awaited<ReturnType<typeof fetchExistingWordCandidates>>[number]) {
  return buildWordContentHash({
    normalizedText: word.normalizedText ?? word.simplified ?? word.hanzi,
    pinyin: word.pinyin,
    meaningsVi: word.meaningsVi,
    hanViet: word.hanViet,
    traditionalVariant: word.traditionalVariant,
    hskLevel: word.hskLevel,
    partOfSpeech: word.partOfSpeech,
    componentBreakdownJson: word.componentBreakdownJson,
    radicalSummary: word.radicalSummary,
    mnemonic: word.mnemonic,
    characterStructureType: word.characterStructureType,
    structureExplanation: word.structureExplanation,
    notes: word.notes,
    ambiguityFlag: word.ambiguityFlag,
    ambiguityNote: word.ambiguityNote,
    readingCandidates: word.readingCandidates,
    mainRadicals: [...word.mainRadicals].sort(),
    topicTags: [...word.topicTags].sort(),
    examples: [...word.examples]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((example) => ({
        chineseText: example.chineseText,
        pinyin: example.pinyin,
        vietnameseMeaning: example.vietnameseMeaning,
      })),
  });
}

function isRowEligibleForApply(row: VocabSyncRow) {
  return row.reviewStatus === "approved" && row.applyStatus !== "applied" && row.applyStatus !== "skipped";
}

async function markRowApplyFailed(row: VocabSyncRow, errorMessage: string) {
  await updateVocabSyncRow(row.id, {
    applyStatus: "failed",
    errorMessage,
  });

  return {
    rowId: row.id,
    batchId: row.batchId,
    status: "failed" as const,
    operation: "failed" as const,
    wordId: row.appliedWordId,
    errorMessage,
  };
}

function buildWordTagLabel(slug: string) {
  return slug
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

async function resolveRadicalAssignments(
  supabase: SupabaseClient,
  mainRadicals: string[],
) {
  if (mainRadicals.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("radicals")
    .select("id, radical")
    .in("radical", mainRadicals);

  if (error) {
    throw error;
  }

  const radicalMap = new Map((data ?? []).map((row) => [row.radical, row.id]));
  const assignments = mainRadicals.map((radical, index) => ({
    radicalId: radicalMap.get(radical) ?? null,
    isMain: index === 0,
    sortOrder: index,
    radical,
  }));

  const missing = assignments.filter((assignment) => !assignment.radicalId).map((assignment) => assignment.radical);
  if (missing.length > 0) {
    throw new Error(`Missing radical mappings: ${missing.join(", ")}`);
  }

  return assignments.map((assignment) => ({
    radicalId: assignment.radicalId as string,
    isMain: assignment.isMain,
    sortOrder: assignment.sortOrder,
  }));
}

async function upsertAppliedWord(params: {
  supabase: SupabaseClient;
  row: VocabSyncRow;
  payload: NormalizedVocabSyncPayload;
  contentHash: string;
  targetWordId: string | null;
  newSlug: string | null;
  appliedBy: string | null;
  mainRadicalId: string | null;
}) {
  const {
    supabase,
    row,
    payload,
    contentHash,
    targetWordId,
    newSlug,
    appliedBy,
    mainRadicalId,
  } = params;
  const now = new Date().toISOString();
  const basePayload = {
    simplified: payload.inputText,
    traditional: payload.traditionalVariant,
    hanzi: payload.inputText,
    pinyin: payload.pinyin,
    han_viet: payload.hanViet,
    vietnamese_meaning: payload.meaningsVi,
    external_source: row.externalSource,
    external_id: row.externalId,
    source_row_key: row.sourceRowKey,
    normalized_text: payload.normalizedText,
    meanings_vi: payload.meaningsVi,
    traditional_variant: payload.traditionalVariant,
    hsk_level: payload.hskLevel,
    part_of_speech: payload.partOfSpeech,
    component_breakdown_json: payload.componentBreakdownJson,
    radical_summary: payload.radicalSummary,
    mnemonic: payload.mnemonic,
    character_structure_type: payload.characterStructureType,
    structure_explanation: payload.structureExplanation,
    notes: payload.notes,
    ambiguity_flag: payload.ambiguityFlag,
    ambiguity_note: payload.ambiguityNote,
    reading_candidates: payload.readingCandidates,
    review_status: "applied" as const,
    ai_status: payload.aiStatus,
    source_confidence: payload.sourceConfidence,
    content_hash: contentHash,
    last_synced_at: now,
    last_source_updated_at: payload.sourceUpdatedAt,
    is_published: true,
    radical_id: mainRadicalId,
  };

  if (!targetWordId) {
    if (!newSlug) {
      throw new Error("Slug required for new word.");
    }

    const { data, error } = await supabase
      .from("words")
      .insert({
        slug: newSlug,
        ...basePayload,
        created_by: appliedBy ?? row.approvedBy ?? null,
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return {
      wordId: data.id,
      operation: "insert" as const,
    };
  }

  const { error } = await supabase
    .from("words")
    .update(basePayload)
    .eq("id", targetWordId);

  if (error) {
    throw error;
  }

  return {
    wordId: targetWordId,
    operation: "update" as const,
  };
}

async function replaceWordExamples(params: {
  supabase: SupabaseClient;
  wordId: string;
  examples: NormalizedVocabSyncPayload["examples"];
}) {
  const { supabase, wordId, examples } = params;
  const { error: deleteError } = await supabase.from("word_examples").delete().eq("word_id", wordId);
  if (deleteError) {
    throw deleteError;
  }

  if (examples.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("word_examples").insert(
    examples.map((example) => ({
      word_id: wordId,
      chinese_text: example.chineseText,
      pinyin: example.pinyin,
      vietnamese_meaning: example.vietnameseMeaning,
      sort_order: example.sortOrder,
    })),
  );

  if (insertError) {
    throw insertError;
  }
}

async function replaceWordTagLinks(params: {
  supabase: SupabaseClient;
  wordId: string;
  topicTags: string[];
}) {
  const { supabase, wordId, topicTags } = params;

  if (topicTags.length > 0) {
    const { error: upsertError } = await supabase.from("word_tags").upsert(
      topicTags.map((slug) => ({
        slug,
        label: buildWordTagLabel(slug),
      })),
      { onConflict: "slug" },
    );

    if (upsertError) {
      throw upsertError;
    }
  }

  const { error: deleteError } = await supabase.from("word_tag_links").delete().eq("word_id", wordId);
  if (deleteError) {
    throw deleteError;
  }

  if (topicTags.length === 0) {
    return;
  }

  const { data: wordTags, error: selectError } = await supabase
    .from("word_tags")
    .select("id, slug")
    .in("slug", topicTags);

  if (selectError) {
    throw selectError;
  }

  const tagIdBySlug = new Map((wordTags ?? []).map((row) => [row.slug, row.id]));
  const missing = topicTags.filter((slug) => !tagIdBySlug.has(slug));
  if (missing.length > 0) {
    throw new Error(`Missing word tags after upsert: ${missing.join(", ")}`);
  }

  const { error: insertError } = await supabase.from("word_tag_links").insert(
    topicTags.map((slug) => ({
      word_id: wordId,
      word_tag_id: tagIdBySlug.get(slug) as string,
    })),
  );

  if (insertError) {
    throw insertError;
  }
}

async function replaceWordRadicals(params: {
  supabase: SupabaseClient;
  wordId: string;
  assignments: Array<{ radicalId: string; isMain: boolean; sortOrder: number }>;
  mainRadicalId: string | null;
}) {
  const { supabase, wordId, assignments, mainRadicalId } = params;
  const { error: deleteError } = await supabase.from("word_radicals").delete().eq("word_id", wordId);
  if (deleteError) {
    throw deleteError;
  }

  if (assignments.length > 0) {
    const { error: insertError } = await supabase.from("word_radicals").insert(
      assignments.map((assignment) => ({
        word_id: wordId,
        radical_id: assignment.radicalId,
        is_main: assignment.isMain,
        sort_order: assignment.sortOrder,
      })),
    );

    if (insertError) {
      throw insertError;
    }
  }

  const { error: updateError } = await supabase
    .from("words")
    .update({ radical_id: mainRadicalId })
    .eq("id", wordId);

  if (updateError) {
    throw updateError;
  }
}

async function finalizeAppliedSyncRow(params: {
  supabase: SupabaseClient;
  row: VocabSyncRow;
  wordId: string;
  operation: "insert" | "update";
  payload: NormalizedVocabSyncPayload;
  contentHash: string;
  appliedBy: string | null;
  appliedAt: string;
  newSlug: string | null;
}) {
  const {
    supabase,
    row,
    wordId,
    operation,
    payload,
    contentHash,
    appliedBy,
    appliedAt,
    newSlug,
  } = params;

  const { error: rowUpdateError } = await supabase
    .from("vocab_sync_rows")
    .update({
      review_status: "applied",
      apply_status: "applied",
      applied_word_id: wordId,
      applied_by: appliedBy,
      applied_at: appliedAt,
      error_message: null,
    })
    .eq("id", row.id);

  if (rowUpdateError) {
    throw rowUpdateError;
  }

  const { error: eventError } = await supabase.from("vocab_sync_apply_events").insert({
    sync_row_id: row.id,
    batch_id: row.batchId,
    word_id: wordId,
    operation,
    status: "applied",
    payload_snapshot: payload as unknown as Record<string, unknown>,
    result_snapshot: {
      wordId,
      slug: newSlug,
      sourceRowKey: row.sourceRowKey,
      externalId: row.externalId,
      contentHash,
      appliedAt,
    },
    applied_by: appliedBy,
    applied_at: appliedAt,
  });

  if (eventError) {
    throw eventError;
  }
}

async function applySingleApprovedRow(row: VocabSyncRow): Promise<ApplyVocabSyncRowResult> {
  if (!isRowEligibleForApply(row)) {
    return {
      rowId: row.id,
      batchId: row.batchId,
      status: "skipped",
      operation: "skipped",
      wordId: row.appliedWordId,
      errorMessage: null,
    };
  }

  let payload: NormalizedVocabSyncPayload;

  try {
    payload = getEffectivePayload(row);
    payload = await normalizePayloadMainRadicals(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approved payload is invalid.";
    return markRowApplyFailed(row, message);
  }

  const effectiveSourceRowKey = buildSourceRowKey({
    externalId: payload.externalId ?? row.externalId,
    normalizedText: payload.normalizedText,
    pinyin: payload.pinyin,
    partOfSpeech: payload.partOfSpeech,
  });

  const parsedRow = buildParsedRowForApply(row, payload);
  if (
    (effectiveSourceRowKey && effectiveSourceRowKey !== row.sourceRowKey) ||
    parsedRow.contentHash !== row.contentHash
  ) {
    row = await updateVocabSyncRow(row.id, {
      sourceRowKey: effectiveSourceRowKey || row.sourceRowKey,
      contentHash: parsedRow.contentHash,
    });
  }
  const candidates = await fetchExistingWordCandidates([parsedRow]);
  const resolvedMatch = resolveVocabSyncMatch(parsedRow, candidates);

  if (resolvedMatch.candidates.length > 1) {
    return markRowApplyFailed(
      row,
      "Multiple production words still match this approved row. Resolve the identity before applying.",
    );
  }

  const matchedWord = resolvedMatch.candidates[0] ?? null;

  if (matchedWord && buildExistingWordHash(matchedWord) === parsedRow.contentHash) {
    const appliedAt = new Date().toISOString();
    const { auth } = await requireAdminSupabase();

    await updateVocabSyncRow(row.id, {
      reviewStatus: "applied",
      applyStatus: "skipped",
      appliedWordId: matchedWord.id,
      appliedBy: auth.user?.id ?? null,
      appliedAt,
      errorMessage: null,
      reviewNote:
        row.reviewNote ??
        "Skipped during apply because the approved payload already matches the current production word.",
    });

    return {
      rowId: row.id,
      batchId: row.batchId,
      status: "skipped",
      operation: "skipped",
      wordId: matchedWord.id,
      errorMessage: null,
    };
  }

  const targetWordId = matchedWord?.id ?? null;
  const newSlug = targetWordId ? null : await buildUniqueWordSlug(payload);
  const { auth, supabase } = await requireAdminSupabase();
  const appliedBy = auth.user?.id ?? null;
  const appliedAt = new Date().toISOString();
  const contentHash = parsedRow.contentHash ?? buildWordContentHash({
    normalizedText: payload.normalizedText ?? "",
    pinyin: payload.pinyin,
    meaningsVi: payload.meaningsVi,
    hanViet: payload.hanViet,
    traditionalVariant: payload.traditionalVariant,
    hskLevel: payload.hskLevel,
    partOfSpeech: payload.partOfSpeech,
    componentBreakdownJson: payload.componentBreakdownJson,
    radicalSummary: payload.radicalSummary,
    mnemonic: payload.mnemonic,
    characterStructureType: payload.characterStructureType,
    structureExplanation: payload.structureExplanation,
    notes: payload.notes,
    ambiguityFlag: payload.ambiguityFlag,
    ambiguityNote: payload.ambiguityNote,
    readingCandidates: payload.readingCandidates,
    mainRadicals: payload.mainRadicals,
    topicTags: payload.topicTags,
    examples: payload.examples,
  });

  try {
    const radicalAssignments = await resolveRadicalAssignments(supabase, payload.mainRadicals);
    const mainRadicalId = radicalAssignments.find((assignment) => assignment.isMain)?.radicalId ?? null;
    const { wordId, operation } = await upsertAppliedWord({
      supabase,
      row,
      payload,
      contentHash,
      targetWordId,
      newSlug,
      appliedBy,
      mainRadicalId,
    });

    await replaceWordExamples({
      supabase,
      wordId,
      examples: payload.examples,
    });
    await replaceWordTagLinks({
      supabase,
      wordId,
      topicTags: payload.topicTags,
    });
    await replaceWordRadicals({
      supabase,
      wordId,
      assignments: radicalAssignments,
      mainRadicalId,
    });
    await finalizeAppliedSyncRow({
      supabase,
      row,
      wordId,
      operation,
      payload,
      contentHash,
      appliedBy,
      appliedAt,
      newSlug,
    });

    logger.info("admin_content_sync_row_applied", {
      rowId: row.id,
      batchId: row.batchId,
      wordId,
      operation,
      status: "applied",
      userId: appliedBy,
    });

    return {
      rowId: row.id,
      batchId: row.batchId,
      status: "applied",
      operation,
      wordId,
      errorMessage: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apply failed.";
    return markRowApplyFailed(row, message);
  }
}

async function loadRowsForApply(input: { batchId?: string; rowIds?: string[] }) {
  if (input.rowIds && input.rowIds.length > 0 && !input.batchId) {
    return listVocabSyncRowsByIds(input.rowIds);
  }

  if (!input.batchId) {
    return [];
  }

  const rows = await listVocabSyncRowsForBatch(input.batchId);
  if (!input.rowIds || input.rowIds.length === 0) {
    return rows.filter((row) => row.reviewStatus === "approved");
  }

  const rowIdSet = new Set(input.rowIds);
  return rows.filter((row) => rowIdSet.has(row.id));
}

export async function applyApprovedVocabSyncRows(input: {
  batchId?: string;
  rowIds?: string[];
}): Promise<ApplyVocabSyncRowsResult> {
  const rows = await loadRowsForApply(input);
  const results: ApplyVocabSyncRowResult[] = [];

  for (const row of rows) {
    results.push(await applySingleApprovedRow(row));
  }

  return {
    attempted: rows.length,
    applied: results.filter((result) => result.status === "applied").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results,
  };
}
