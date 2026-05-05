import type {
  ExistingGrammarSnapshot,
  GrammarSyncMatchResult,
  ParsedGrammarSyncRow,
} from "@/features/grammar-sync/types";
import type { VocabSyncChangeKind } from "@/features/vocabulary-sync/types";

export interface GrammarSyncClassification {
  changeClassification: VocabSyncChangeKind;
  matchResult: GrammarSyncMatchResult;
  matchedGrammarIds: string[];
  diffSummary: Record<string, unknown> | null;
  errorMessage: string | null;
}

function comparable(value: string | null | undefined) {
  return value?.normalize("NFKC").trim().toLowerCase() ?? "";
}

function summarizeChangedFields(row: ParsedGrammarSyncRow, grammar: ExistingGrammarSnapshot) {
  const payload = row.normalizedPayload;
  const changedFields: string[] = [];

  if (payload.title !== grammar.title) changedFields.push("title");
  if (payload.slug !== grammar.slug) changedFields.push("slug");
  if (payload.structureText !== grammar.structureText) changedFields.push("structure_text");
  if (payload.explanationVi !== grammar.explanationVi) changedFields.push("explanation_vi");
  if ((payload.notes ?? null) !== (grammar.notes ?? null)) changedFields.push("notes");
  if (payload.hskLevel !== grammar.hskLevel) changedFields.push("hsk_level");
  if (payload.sourceConfidence !== grammar.sourceConfidence) changedFields.push("source_confidence");
  if (payload.ambiguityFlag !== grammar.ambiguityFlag) changedFields.push("ambiguity_flag");
  if ((payload.ambiguityNote ?? null) !== (grammar.ambiguityNote ?? null)) changedFields.push("ambiguity_note");
  if (payload.reviewStatus !== grammar.reviewStatus) changedFields.push("review_status");
  if (payload.aiStatus !== grammar.aiStatus) changedFields.push("ai_status");
  if (payload.examples.length !== grammar.examples.length) changedFields.push("examples");

  return changedFields;
}

export function classifyGrammarSyncRow(
  row: ParsedGrammarSyncRow,
  existingGrammar: ExistingGrammarSnapshot[],
): GrammarSyncClassification {
  if (row.parseErrors.length > 0 || row.initialChangeClassification === "invalid") {
    return {
      changeClassification: "invalid",
      matchResult: "none",
      matchedGrammarIds: [],
      diffSummary: { parseErrors: row.parseErrors },
      errorMessage: row.parseErrors.join(" "),
    };
  }

  const bySlug = existingGrammar.filter((grammar) => comparable(grammar.slug) === comparable(row.normalizedPayload.slug));
  const bySourceKey = existingGrammar.filter(
    (grammar) => grammar.sourceRowKey && comparable(grammar.sourceRowKey) === comparable(row.sourceRowKey),
  );
  const byTitleStructure = existingGrammar.filter(
    (grammar) =>
      comparable(grammar.title) === comparable(row.normalizedPayload.title) &&
      comparable(grammar.structureText) === comparable(row.normalizedPayload.structureText),
  );

  const candidates = bySlug.length > 0 ? bySlug : bySourceKey.length > 0 ? bySourceKey : byTitleStructure;
  const matchResult: GrammarSyncMatchResult =
    bySlug.length > 0 ? "slug" : bySourceKey.length > 0 ? "source_row_key" : byTitleStructure.length > 0 ? "title_structure" : "none";

  if (candidates.length > 1) {
    return {
      changeClassification: "conflict",
      matchResult: "conflict",
      matchedGrammarIds: candidates.map((grammar) => grammar.id),
      diffSummary: {
        reason: "Multiple grammar points matched this row.",
        candidates: candidates.map((grammar) => ({
          id: grammar.id,
          slug: grammar.slug,
          title: grammar.title,
        })),
      },
      errorMessage: "Multiple existing grammar points matched this source row.",
    };
  }

  if (candidates.length === 0) {
    return {
      changeClassification: "new",
      matchResult,
      matchedGrammarIds: [],
      diffSummary: { reason: "No existing grammar point matched this row." },
      errorMessage: null,
    };
  }

  const [matched] = candidates;
  if (matched.contentHash === row.contentHash) {
    return {
      changeClassification: "unchanged",
      matchResult,
      matchedGrammarIds: [matched.id],
      diffSummary: { reason: "matching_content_hash", matchedGrammarId: matched.id },
      errorMessage: null,
    };
  }

  return {
    changeClassification: "changed",
    matchResult,
    matchedGrammarIds: [matched.id],
    diffSummary: {
      reason: "content_hash_changed",
      matchedGrammarId: matched.id,
      matchedGrammarSlug: matched.slug,
      changedFields: summarizeChangedFields(row, matched),
    },
    errorMessage: null,
  };
}
