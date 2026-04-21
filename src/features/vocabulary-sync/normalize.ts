import "server-only";

import { z } from "zod";

import { buildWordContentHash } from "@/features/vocabulary-sync/content-hash";
import {
  type VocabSyncChangeKind,
  type WordAiStatus,
  type WordReviewStatus,
  type WordSourceConfidence,
  type NormalizedExample,
  type NormalizedVocabSyncPayload,
} from "@/features/vocabulary-sync/types";

const wordReviewStatusSchema = z.enum(["pending", "needs_review", "approved", "rejected", "applied"]);
const wordAiStatusSchema = z.enum(["pending", "processing", "done", "failed", "skipped"]);
const wordSourceConfidenceSchema = z.enum(["low", "medium", "high"]);



export interface ParsedVocabSyncRow {
  rowNumber: number;
  rawPayload: Record<string, unknown>;
  normalizedPayload: NormalizedVocabSyncPayload;
  sourceRowKey: string;
  contentHash: string | null;
  parseErrors: string[];
  initialChangeClassification: VocabSyncChangeKind;
}

function trimToNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeComparableText(value: string | null) {
  return value?.normalize("NFKC").replace(/\s+/g, " ").trim() ?? null;
}

function normalizeOptionalText(value: unknown) {
  const trimmed = trimToNull(value);
  return trimmed ? normalizeComparableText(trimmed) : null;
}

function normalizeLowercaseEnum(value: unknown) {
  return normalizeOptionalText(value)?.toLowerCase() ?? null;
}

function splitPipeDelimited(value: unknown) {
  const trimmed = trimToNull(value);
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split("|")
    .map((part) => normalizeComparableText(part))
    .filter((part): part is string => Boolean(part));
}

function dedupePreserveOrder(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function parseBooleanValue(value: unknown) {
  const normalized = normalizeLowercaseEnum(value);
  if (!normalized) {
    return false;
  }

  return ["true", "1", "yes", "y"].includes(normalized);
}

function parseHskLevel(value: unknown, parseErrors: string[]) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 9) {
    parseErrors.push("Invalid hsk_level.");
    return null;
  }

  return parsed;
}

function parseDateValue(value: unknown, parseErrors: string[]) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  const direct = Date.parse(normalized);
  if (!Number.isNaN(direct)) {
    return new Date(direct).toISOString();
  }

  const dayMonthYearMatch = normalized.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (dayMonthYearMatch) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = dayMonthYearMatch;
    const parsed = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)),
    );

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  parseErrors.push("Invalid updated_at value.");
  return null;
}

function parseJsonValue(value: unknown, fieldName: string, parseErrors: string[]) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    parseErrors.push(`Invalid ${fieldName} JSON.`);
    return null;
  }
}

function parseExamples(value: unknown, parseErrors: string[]) {
  const trimmed = trimToNull(value);
  if (!trimmed) {
    return [] as NormalizedExample[];
  }

  return trimmed
    .split(/\s*\|\|\s*|\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const taggedSegments = entry.split("|").map((segment) => segment.trim());
      const taggedValues = taggedSegments.reduce<Record<string, string>>((result, segment) => {
        const [key, ...rest] = segment.split("=");
        if (!key || rest.length === 0) {
          return result;
        }

        result[key.trim().toUpperCase()] = rest.join("=").trim();
        return result;
      }, {});

      const chineseText = normalizeComparableText(taggedValues.CN ?? taggedSegments[0] ?? null);
      const pinyin = normalizeComparableText(taggedValues.PY ?? taggedSegments[1] ?? null);
      const vietnameseMeaning = normalizeComparableText(taggedValues.VI ?? taggedSegments[2] ?? null);

      if (!chineseText || !vietnameseMeaning) {
        parseErrors.push(`Invalid examples entry at position ${index + 1}.`);
        return null;
      }

      return {
        chineseText,
        pinyin,
        vietnameseMeaning,
        sortOrder: index + 1,
      } satisfies NormalizedExample;
    })
    .filter((example): example is NormalizedExample => Boolean(example));
}

function parseSourceConfidence(value: unknown, parseErrors: string[]) {
  const normalized = normalizeLowercaseEnum(value);
  if (!normalized) {
    return null;
  }

  const parsed = wordSourceConfidenceSchema.safeParse(normalized);
  if (!parsed.success) {
    parseErrors.push("Invalid source_confidence.");
    return null;
  }

  return parsed.data;
}

function parseReviewStatus(value: unknown, parseErrors: string[]) {
  const normalized = normalizeLowercaseEnum(value) ?? "pending";
  const parsed = wordReviewStatusSchema.safeParse(normalized);
  if (!parsed.success) {
    parseErrors.push("Invalid review_status.");
    return "pending" satisfies WordReviewStatus;
  }

  return parsed.data;
}

function parseAiStatus(value: unknown, parseErrors: string[]) {
  const normalized = normalizeLowercaseEnum(value) ?? "pending";
  const parsed = wordAiStatusSchema.safeParse(normalized);
  if (!parsed.success) {
    parseErrors.push("Invalid ai_status.");
    return "pending" satisfies WordAiStatus;
  }

  return parsed.data;
}

function normalizeReadingCandidates(value: unknown) {
  const trimmed = trimToNull(value);
  if (!trimmed) {
    return null;
  }

  return trimmed
    .split("||")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) =>
      segment
        .split("|")
        .map((part) => normalizeComparableText(part))
        .filter((part): part is string => Boolean(part))
        .join("|"),
    )
    .filter(Boolean)
    .join(" || ");
}

export function buildSourceRowKey(input: {
  externalId: string | null;
  normalizedText: string | null;
  pinyin: string | null;
  partOfSpeech: string | null;
}) {
  const parts = [
    input.normalizedText,
    input.pinyin?.toLowerCase() ?? null,
    input.partOfSpeech?.toLowerCase() ?? null,
  ].filter((part): part is string => Boolean(part));

  return parts.join("::");
}

export function parseAndNormalizeVocabSyncRow(input: {
  rowNumber: number;
  values: Record<string, string>;
}) {
  const parseErrors: string[] = [];

  const normalizedPayload: NormalizedVocabSyncPayload = {
    externalId: normalizeOptionalText(input.values.external_id),
    inputText: normalizeOptionalText(input.values.input_text),
    normalizedText: normalizeOptionalText(input.values.normalized_text ?? input.values.input_text),
    pinyin: normalizeOptionalText(input.values.pinyin),
    meaningsVi: normalizeOptionalText(input.values.meanings_vi),
    hanViet: normalizeOptionalText(input.values.han_viet),
    traditionalVariant: normalizeOptionalText(input.values.traditional_variant),
    mainRadicals: dedupePreserveOrder(splitPipeDelimited(input.values.main_radicals)),
    componentBreakdownJson: parseJsonValue(
      input.values.component_breakdown_json,
      "component_breakdown_json",
      parseErrors,
    ),
    radicalSummary: normalizeOptionalText(input.values.radical_summary),
    hskLevel: parseHskLevel(input.values.hsk_level, parseErrors),
    partOfSpeech: normalizeLowercaseEnum(input.values.part_of_speech),
    topicTags: dedupePreserveOrder(splitPipeDelimited(input.values.topic_tags).map((tag) => tag.toLowerCase())),
    examples: parseExamples(input.values.examples, parseErrors),
    similarChars: dedupePreserveOrder(splitPipeDelimited(input.values.similar_chars)),
    characterStructureType: normalizeLowercaseEnum(input.values.character_structure_type),
    structureExplanation: normalizeOptionalText(input.values.structure_explanation),
    mnemonic: normalizeOptionalText(input.values.mnemonic),
    notes: normalizeOptionalText(input.values.notes),
    sourceConfidence: parseSourceConfidence(input.values.source_confidence, parseErrors),
    ambiguityFlag: parseBooleanValue(input.values.ambiguity_flag),
    ambiguityNote: normalizeOptionalText(input.values.ambiguity_note),
    readingCandidates: normalizeReadingCandidates(input.values.reading_candidates),
    reviewStatus: parseReviewStatus(input.values.review_status, parseErrors),
    aiStatus: parseAiStatus(input.values.ai_status, parseErrors),
    sourceUpdatedAt: parseDateValue(input.values.updated_at, parseErrors),
  };

  if (!normalizedPayload.normalizedText) {
    parseErrors.push("normalized_text is required.");
  }

  if (!normalizedPayload.pinyin) {
    parseErrors.push("pinyin is required.");
  }

  if (!normalizedPayload.meaningsVi) {
    parseErrors.push("meanings_vi is required.");
  }

  const sourceRowKey = buildSourceRowKey({
    externalId: normalizedPayload.externalId,
    normalizedText: normalizedPayload.normalizedText,
    pinyin: normalizedPayload.pinyin,
    partOfSpeech: normalizedPayload.partOfSpeech,
  });

  if (!sourceRowKey) {
    parseErrors.push("Could not derive source_row_key.");
  }

  const contentHash =
    parseErrors.length === 0
      ? buildWordContentHash({
          normalizedText: normalizedPayload.normalizedText ?? "",
          pinyin: normalizedPayload.pinyin,
          meaningsVi: normalizedPayload.meaningsVi,
          hanViet: normalizedPayload.hanViet,
          traditionalVariant: normalizedPayload.traditionalVariant,
          hskLevel: normalizedPayload.hskLevel,
          partOfSpeech: normalizedPayload.partOfSpeech,
          componentBreakdownJson: normalizedPayload.componentBreakdownJson,
          radicalSummary: normalizedPayload.radicalSummary,
          mnemonic: normalizedPayload.mnemonic,
          characterStructureType: normalizedPayload.characterStructureType,
          structureExplanation: normalizedPayload.structureExplanation,
          notes: normalizedPayload.notes,
          ambiguityFlag: normalizedPayload.ambiguityFlag,
          ambiguityNote: normalizedPayload.ambiguityNote,
          readingCandidates: normalizedPayload.readingCandidates,
          mainRadicals: normalizedPayload.mainRadicals,
          topicTags: normalizedPayload.topicTags,
          examples: normalizedPayload.examples,
        })
      : null;

  return {
    rowNumber: input.rowNumber,
    rawPayload: input.values,
    normalizedPayload,
    sourceRowKey,
    contentHash,
    parseErrors,
    initialChangeClassification: (parseErrors.length > 0 ? "invalid" : "new") as VocabSyncChangeKind,
  } satisfies ParsedVocabSyncRow;
}
