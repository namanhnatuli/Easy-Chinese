import "server-only";

import { z } from "zod";

import { requireAdminSupabase } from "@/features/admin/shared";
import { buildWordSlugBase } from "@/features/vocabulary-sync/apply-slug";
import { buildWordContentHash } from "@/features/vocabulary-sync/content-hash";
import { resolveVocabSyncMatch } from "@/features/vocabulary-sync/matching";
import {
  buildSourceRowKey,
  type NormalizedVocabSyncPayload,
  type ParsedVocabSyncRow,
} from "@/features/vocabulary-sync/normalize";
import { getVocabSyncRow, listVocabSyncRowsForBatch, updateVocabSyncRow } from "@/features/vocabulary-sync/repository";
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

const applyRpcResultSchema = z.object({
  sync_row_id: z.string().uuid(),
  word_id: z.string().uuid().nullable(),
  operation: z.string(),
  apply_status: z.enum(["pending", "applied", "failed", "skipped"]),
  error_message: z.string().nullable(),
  audit_event_id: z.string().uuid().nullable(),
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

  return {
    externalId: parsed.externalId ?? row.externalId ?? null,
    inputText: parsed.inputText ?? null,
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
  const { data, error } = await supabase
    .rpc("apply_vocab_sync_row", {
      p_sync_row_id: row.id,
      p_target_word_id: targetWordId,
      p_new_slug: newSlug,
      p_content_hash: parsedRow.contentHash,
      p_applied_by: auth.user?.id ?? null,
    })
    .single();

  if (error) {
    return markRowApplyFailed(row, error.message);
  }

  const rpcResult = applyRpcResultSchema.parse(data);
  const status =
    rpcResult.apply_status === "applied"
      ? "applied"
      : rpcResult.apply_status === "failed"
        ? "failed"
        : "skipped";
  const operation =
    rpcResult.operation === "insert" ||
    rpcResult.operation === "update" ||
    rpcResult.operation === "failed"
      ? rpcResult.operation
    : "skipped";

  logger.info("admin_content_sync_row_applied", {
    rowId: row.id,
    batchId: row.batchId,
    wordId: rpcResult.word_id,
    operation,
    status,
    userId: auth.user?.id ?? null,
  });

  return {
    rowId: row.id,
    batchId: row.batchId,
    status,
    operation,
    wordId: rpcResult.word_id,
    errorMessage: rpcResult.error_message,
  };
}

async function loadRowsForApply(input: { batchId?: string; rowIds?: string[] }) {
  if (input.rowIds && input.rowIds.length === 1 && !input.batchId) {
    const row = await getVocabSyncRow(input.rowIds[0]);
    return row ? [row] : [];
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
