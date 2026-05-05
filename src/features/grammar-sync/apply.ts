"use server";

import { z } from "zod";

import { requireAdminSupabase } from "@/features/admin/shared";
import { buildGrammarContentHash } from "@/features/grammar-sync/content-hash";
import {
  getGrammarSyncPreviewRows,
} from "@/features/grammar-sync/preview";
import {
  getGrammarSyncRow,
  listGrammarSyncRowsByIds,
  updateGrammarSyncRow,
} from "@/features/grammar-sync/repository";
import type { GrammarSyncRow, NormalizedGrammarSyncPayload } from "@/features/grammar-sync/types";
import { logger } from "@/lib/logger";

const grammarPayloadSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  structureText: z.string().trim().min(1),
  explanationVi: z.string().trim().min(1),
  notes: z.string().trim().nullable(),
  examples: z.array(
    z.object({
      chineseText: z.string().trim().min(1),
      pinyin: z.string().trim().nullable(),
      vietnameseMeaning: z.string().trim().nullable(),
      sortOrder: z.number().int().positive(),
    }),
  ),
  hskLevel: z.number().int().min(1).max(9),
  sourceConfidence: z.enum(["low", "medium", "high"]).nullable(),
  ambiguityFlag: z.boolean(),
  ambiguityNote: z.string().trim().nullable(),
  reviewStatus: z.enum(["pending", "needs_review", "approved", "rejected", "applied"]),
  aiStatus: z.enum(["pending", "processing", "done", "failed", "skipped"]),
  sourceUpdatedAt: z.string().trim().nullable(),
});

function getEffectivePayload(row: GrammarSyncRow): NormalizedGrammarSyncPayload {
  return grammarPayloadSchema.parse(row.adminEditedPayload ?? row.normalizedPayload);
}

async function findExistingGrammarPointId(payload: NormalizedGrammarSyncPayload, row: GrammarSyncRow) {
  const { supabase } = await requireAdminSupabase();
  const matchedId = row.matchedGrammarIds[0] ?? null;
  if (matchedId) {
    return matchedId;
  }

  const { data, error } = await supabase
    .from("grammar_points")
    .select("id")
    .eq("slug", payload.slug)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

async function applyGrammarSyncRow(row: GrammarSyncRow) {
  const { supabase, auth } = await requireAdminSupabase();

  if (row.reviewStatus !== "approved" || row.applyStatus === "applied" || row.applyStatus === "skipped") {
    return row;
  }

  if (row.changeClassification === "invalid" || row.changeClassification === "conflict") {
    return updateGrammarSyncRow(row.id, {
      applyStatus: "failed",
      errorMessage: "Invalid or conflicted grammar rows cannot be applied.",
    });
  }

  const payload = getEffectivePayload(row);
  const contentHash = buildGrammarContentHash(payload);
  const grammarPointPatch = {
    title: payload.title,
    slug: payload.slug,
    hsk_level: payload.hskLevel,
    structure_text: payload.structureText,
    explanation_vi: payload.explanationVi,
    notes: payload.notes,
    source_confidence: payload.sourceConfidence,
    ambiguity_flag: payload.ambiguityFlag,
    ambiguity_note: payload.ambiguityNote,
    review_status: "approved",
    ai_status: payload.aiStatus,
    external_source: "google_sheets",
    source_row_key: row.sourceRowKey,
    content_hash: contentHash,
    last_synced_at: new Date().toISOString(),
    last_source_updated_at: payload.sourceUpdatedAt,
    is_published: true,
  };

  let grammarPointId = await findExistingGrammarPointId(payload, row);
  let operation = "update";

  if (grammarPointId) {
    const { error } = await supabase
      .from("grammar_points")
      .update(grammarPointPatch)
      .eq("id", grammarPointId);

    if (error) throw error;
  } else {
    operation = "insert";
    const { data, error } = await supabase
      .from("grammar_points")
      .insert({
        ...grammarPointPatch,
        created_by: auth.user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) throw error;
    grammarPointId = data.id;
  }

  const { error: deleteExamplesError } = await supabase
    .from("grammar_examples")
    .delete()
    .eq("grammar_point_id", grammarPointId);

  if (deleteExamplesError) throw deleteExamplesError;

  if (payload.examples.length > 0) {
    const { error: examplesError } = await supabase.from("grammar_examples").insert(
      payload.examples.map((example) => ({
        grammar_point_id: grammarPointId,
        chinese_text: example.chineseText,
        pinyin: example.pinyin,
        vietnamese_meaning: example.vietnameseMeaning ?? "",
        sort_order: example.sortOrder,
      })),
    );

    if (examplesError) throw examplesError;
  }

  await supabase.from("grammar_sync_apply_events").insert({
    sync_row_id: row.id,
    batch_id: row.batchId,
    grammar_point_id: grammarPointId,
    operation,
    status: "applied",
    payload_snapshot: payload as unknown as Record<string, unknown>,
    result_snapshot: { grammarPointId, exampleCount: payload.examples.length },
    applied_by: auth.user?.id ?? null,
  });

  logger.info("grammar_sync_row_applied", {
    rowId: row.id,
    grammarPointId,
    operation,
  });

  return updateGrammarSyncRow(row.id, {
    reviewStatus: "applied",
    applyStatus: "applied",
    appliedGrammarId: grammarPointId,
    appliedBy: auth.user?.id ?? null,
    appliedAt: new Date().toISOString(),
    errorMessage: null,
    contentHash,
  });
}

export async function applyApprovedGrammarSyncRows(input: {
  batchId?: string;
  rowIds?: string[];
}) {
  const rows = input.rowIds?.length
    ? await listGrammarSyncRowsByIds(input.rowIds)
    : input.batchId
      ? await getGrammarSyncPreviewRows(input.batchId)
      : [];

  const eligibleRows = rows.filter(
    (row) =>
      row.reviewStatus === "approved" &&
      row.applyStatus !== "applied" &&
      row.applyStatus !== "skipped",
  );

  const results: GrammarSyncRow[] = [];
  for (const row of eligibleRows) {
    try {
      results.push(await applyGrammarSyncRow(row));
    } catch (error) {
      logger.error("grammar_sync_row_apply_failed", error, { rowId: row.id });
      results.push(
        await updateGrammarSyncRow(row.id, {
          applyStatus: "failed",
          errorMessage: error instanceof Error ? error.message : "Failed to apply grammar row.",
        }),
      );
    }
  }

  return results;
}

export async function applyApprovedGrammarSyncRowById(rowId: string) {
  const row = await getGrammarSyncRow(rowId);
  if (!row) {
    throw new Error("Grammar sync row not found.");
  }

  return applyApprovedGrammarSyncRows({ rowIds: [rowId] });
}
