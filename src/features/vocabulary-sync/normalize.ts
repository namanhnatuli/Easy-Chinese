import "server-only";

import { z } from "zod";

import { hashVocabularyPayload, buildWordContentHash } from "@/features/vocabulary-sync/content-hash";
import { PART_OF_SPEECH_LIST } from "@/features/vocabulary-sync/constants";
import {
  type VocabSyncChangeKind,
  type WordAiStatus,
  type WordReviewStatus,
  type WordSourceConfidence,
  type NormalizedExample,
  type NormalizedSense,
  type NormalizedSenseExample,
  type NormalizedVocabSyncPayload,
} from "@/features/vocabulary-sync/types";

const wordReviewStatusSchema = z.enum(["pending", "needs_review", "approved", "rejected", "applied"]);
const wordAiStatusSchema = z.enum(["pending", "processing", "done", "failed", "skipped"]);
const wordSourceConfidenceSchema = z.enum(["low", "medium", "high"]);
const allowedPartOfSpeechValues = new Set(PART_OF_SPEECH_LIST);

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

function normalizeLegacyPartOfSpeechSummary(value: unknown, warnings: string[]) {
  const values = splitPipeDelimited(value).map((part) => part.toLowerCase());
  if (values.length === 0) {
    return null;
  }

  const validValues = dedupePreserveOrder(values.filter((part) => allowedPartOfSpeechValues.has(part)));
  const invalidValues = values.filter((part) => !allowedPartOfSpeechValues.has(part));

  if (invalidValues.length > 0) {
    warnings.push(`Invalid legacy part_of_speech values ignored: ${dedupePreserveOrder(invalidValues).join(" | ")}.`);
  }

  return validValues.join(" | ") || null;
}

function normalizeSensePartOfSpeech(value: unknown, warnings: string[], fieldName: string) {
  const normalized = normalizeLowercaseEnum(value);
  if (!normalized) {
    warnings.push(`Missing ${fieldName}.`);
    return null;
  }

  if (!allowedPartOfSpeechValues.has(normalized)) {
    warnings.push(`Invalid ${fieldName}: ${normalized}.`);
    return null;
  }

  return normalized;
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
  if (typeof value === "boolean") {
    return value;
  }

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readObjectValue(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

function parseSenseExamplesValue(
  rawExamples: unknown,
  parseErrors: string[],
  senseLabel: string,
): NormalizedSenseExample[] {
  if (rawExamples == null) {
    return [];
  }

  if (typeof rawExamples === "string") {
    return parseExamples(rawExamples, parseErrors).map((example) => ({
      cn: example.chineseText,
      py: example.pinyin,
      vi: example.vietnameseMeaning,
    }));
  }

  if (!Array.isArray(rawExamples)) {
    parseErrors.push(`Invalid ${senseLabel} examples.`);
    return [];
  }

  return rawExamples
    .map((entry, exampleIndex) => {
      const exampleLabel = `${senseLabel} example ${exampleIndex + 1}`;

      if (typeof entry === "string") {
        const examples = parseExamples(entry, parseErrors);
        return examples[0]
          ? {
              cn: examples[0].chineseText,
              py: examples[0].pinyin,
              vi: examples[0].vietnameseMeaning,
            }
          : null;
      }

      if (!isPlainObject(entry)) {
        parseErrors.push(`Invalid ${exampleLabel}.`);
        return null;
      }

      const cn = normalizeComparableText(
        readObjectValue(entry, "cn", "chinese", "chinese_text", "chineseText") as string | null,
      );
      const py = normalizeComparableText(
        readObjectValue(entry, "py", "pinyin", "romanization") as string | null,
      );
      const vi = normalizeComparableText(
        readObjectValue(entry, "vi", "meaning_vi", "meaningVi", "vietnamese_meaning", "vietnameseMeaning") as string | null,
      );

      if (!cn || !vi) {
        parseErrors.push(`Invalid ${exampleLabel}.`);
        return null;
      }

      return {
        cn,
        py,
        vi,
      } satisfies NormalizedSenseExample;
    })
    .filter((example): example is NormalizedSenseExample => Boolean(example));
}

function parseSenseOrder(value: unknown, defaultValue: number, parseErrors: string[], fieldName: string) {
  if (value == null || value === "") {
    return defaultValue;
  }

  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 1) {
      parseErrors.push(`Invalid ${fieldName}.`);
      return defaultValue;
    }

    return value;
  }

  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return defaultValue;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1) {
    parseErrors.push(`Invalid ${fieldName}.`);
    return defaultValue;
  }

  return parsed;
}

function parseSenseBoolean(value: unknown, defaultValue: boolean) {
  if (value == null || value === "") {
    return defaultValue;
  }

  return parseBooleanValue(value);
}

function isEmptySenseCandidate(input: {
  pinyin: string | null;
  partOfSpeech: string | null;
  meaningVi: string | null;
  usageNote: string | null;
  examples: NormalizedSenseExample[];
}) {
  return !input.pinyin && !input.partOfSpeech && !input.meaningVi && !input.usageNote && input.examples.length === 0;
}

function buildDefaultSense(input: {
  values: Record<string, string>;
  legacyExamples: NormalizedExample[];
  validationWarnings: string[];
}): NormalizedSense | null {
  const pinyin = normalizeOptionalText(input.values.pinyin);
  const meaningVi = normalizeOptionalText(input.values.meanings_vi ?? input.values.vietnamese_meaning);
  const partOfSpeech = normalizeLegacyPartOfSpeechSummary(input.values.part_of_speech, input.validationWarnings);
  const usageNote = normalizeOptionalText(input.values.notes);

  if (!pinyin || !meaningVi) {
    return null;
  }

  return {
    pinyin,
    partOfSpeech,
    meaningVi,
    usageNote,
    senseOrder: 1,
    isPrimary: true,
    examples: input.legacyExamples.map((example) => ({
      cn: example.chineseText,
      py: example.pinyin,
      vi: example.vietnameseMeaning,
    })),
  };
}

function parseSensesJsonValue(value: unknown, parseErrors: string[]) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = parseJsonValue(value, "senses_json", parseErrors);
  if (parsed == null) {
    return null;
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (isPlainObject(parsed) && Array.isArray(parsed.senses)) {
    return parsed.senses;
  }

  parseErrors.push("Invalid senses_json JSON. Expected an array or an object with a senses array.");
  return null;
}

function normalizeSenseCandidate(
  rawSense: unknown,
  index: number,
  validationWarnings: string[],
): NormalizedSense | null {
  const senseLabel = `sense ${index + 1}`;
  const senseWarnings: string[] = [];

  if (!isPlainObject(rawSense)) {
    validationWarnings.push(`Invalid ${senseLabel}.`);
    return null;
  }

  const examples = parseSenseExamplesValue(
    readObjectValue(rawSense, "examples", "example_sentences", "exampleSentences"),
    senseWarnings,
    senseLabel,
  );
  const pinyin = normalizeOptionalText(readObjectValue(rawSense, "pinyin", "py"));
  const partOfSpeech = normalizeSensePartOfSpeech(
    readObjectValue(rawSense, "part_of_speech", "partOfSpeech"),
    senseWarnings,
    `${senseLabel} part_of_speech`,
  );
  const meaningVi = normalizeOptionalText(
    readObjectValue(rawSense, "meaning_vi", "meaningVi", "vietnamese_meaning", "vietnameseMeaning", "vi"),
  );
  const usageNote = normalizeOptionalText(readObjectValue(rawSense, "usage_note", "usageNote", "notes"));
  const senseOrder = parseSenseOrder(
    readObjectValue(rawSense, "sense_order", "senseOrder", "order"),
    index + 1,
    senseWarnings,
    `${senseLabel} sense_order`,
  );
  const isPrimary = parseSenseBoolean(
    readObjectValue(rawSense, "is_primary", "isPrimary"),
    index === 0,
  );

  if (isEmptySenseCandidate({ pinyin, partOfSpeech, meaningVi, usageNote, examples })) {
    return null;
  }

  if (!pinyin || !meaningVi || !partOfSpeech) {
    validationWarnings.push(
      `Invalid ${senseLabel}. Each sense must include pinyin, part_of_speech, and meaning_vi.`,
      ...senseWarnings,
    );
    return null;
  }

  return {
    pinyin,
    partOfSpeech,
    meaningVi,
    usageNote,
    senseOrder,
    isPrimary,
    examples,
    validationWarnings: senseWarnings,
  };
}

function ensureExactlyOnePrimarySense(senses: NormalizedSense[]) {
  if (senses.length === 0) {
    return senses;
  }

  const sorted = [...senses].sort((left, right) => left.senseOrder - right.senseOrder);
  const primaryIndex = sorted.findIndex((sense) => sense.isPrimary);
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

  return sorted.map((sense, index) => ({
    ...sense,
    isPrimary: index === resolvedPrimaryIndex,
  }));
}

function deriveMeaningsViFromSenses(senses: NormalizedSense[]) {
  return dedupePreserveOrder(senses.map((sense) => sense.meaningVi)).join(" | ") || null;
}

function derivePartOfSpeechFromSenses(senses: NormalizedSense[]) {
  const values = dedupePreserveOrder(
    senses
      .map((sense) => sense.partOfSpeech)
      .filter((value): value is string => Boolean(value)),
  );

  return values.join(" | ") || null;
}

function deriveReadingCandidatesFromSenses(senses: NormalizedSense[]) {
  const values = dedupePreserveOrder(
    senses.map((sense) => `${sense.pinyin}=${sense.meaningVi}`),
  );

  return values.join(" || ") || null;
}

function flattenSenseExamples(senses: NormalizedSense[]) {
  let sortOrder = 1;

  return senses.flatMap((sense) =>
    sense.examples.map((example) => ({
      chineseText: example.cn,
      pinyin: example.py,
      vietnameseMeaning: example.vi,
      sortOrder: sortOrder++,
    })),
  );
}

function buildSenseSourceKey(input: {
  normalizedText: string | null;
  sense: NormalizedSense;
}) {
  const parts = [
    input.normalizedText,
    input.sense.pinyin.toLowerCase(),
    input.sense.partOfSpeech?.toLowerCase() ?? null,
    input.sense.meaningVi.toLowerCase(),
  ].filter((part): part is string => Boolean(part));

  return parts.join("::");
}

function buildSenseContentHash(sense: NormalizedSense) {
  return hashVocabularyPayload({
    pinyin: sense.pinyin,
    partOfSpeech: sense.partOfSpeech,
    meaningVi: sense.meaningVi,
    usageNote: sense.usageNote,
    senseOrder: sense.senseOrder,
    isPrimary: sense.isPrimary,
    examples: sense.examples,
  });
}

export function parseAndNormalizeSenses(input: {
  values: Record<string, string>;
  parseErrors: string[];
  normalizedText: string | null;
}) {
  const validationWarnings: string[] = [];
  const rawSenses = parseSensesJsonValue(input.values.senses_json, input.parseErrors);
  const parsedSenses =
    rawSenses?.map((sense, index) =>
      normalizeSenseCandidate(sense, index, validationWarnings),
    ).filter(
      (sense): sense is NormalizedSense => Boolean(sense),
    ) ?? [];

  const usingSensesJson = Boolean(rawSenses && parsedSenses.length > 0);
  const legacyExamples = usingSensesJson ? [] : parseExamples(input.values.examples, input.parseErrors);
  const fallbackSense = buildDefaultSense({
    values: input.values,
    legacyExamples,
    validationWarnings,
  });

  if (rawSenses && parsedSenses.length === 0) {
    input.parseErrors.push("senses_json does not contain any valid senses.");
  }

  if (usingSensesJson) {
    normalizeLegacyPartOfSpeechSummary(input.values.part_of_speech, validationWarnings);
  }

  const normalizedSenses = ensureExactlyOnePrimarySense(
    parsedSenses.length > 0 ? parsedSenses : !rawSenses && fallbackSense ? [fallbackSense] : [],
  );
  const primarySense = normalizedSenses.find((sense) => sense.isPrimary) ?? normalizedSenses[0] ?? null;
  const examples = flattenSenseExamples(normalizedSenses);

  return {
    senses: normalizedSenses,
    examples,
    pinyin: primarySense?.pinyin ?? null,
    meaningsVi: deriveMeaningsViFromSenses(normalizedSenses),
    partOfSpeech: derivePartOfSpeechFromSenses(normalizedSenses),
    readingCandidates: deriveReadingCandidatesFromSenses(normalizedSenses),
    senseSourceKeys: normalizedSenses.map((sense) =>
      buildSenseSourceKey({
        normalizedText: input.normalizedText,
        sense,
      }),
    ),
    senseContentHashes: normalizedSenses.map((sense) => buildSenseContentHash(sense)),
    senseSourceMode: usingSensesJson ? "senses_json" as const : "legacy" as const,
    validationWarnings: dedupePreserveOrder(validationWarnings),
  };
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
  const normalizedText = normalizeOptionalText(input.values.normalized_text ?? input.values.input_text);
  const normalizedMainRadicals = dedupePreserveOrder(splitPipeDelimited(input.values.main_radicals));
  const normalizedTopicTags = dedupePreserveOrder(splitPipeDelimited(input.values.topic_tags).map((tag) => tag.toLowerCase()));
  const normalizedLegacyNotes = normalizeOptionalText(input.values.notes);
  const senses = parseAndNormalizeSenses({
    values: input.values,
    parseErrors,
    normalizedText,
  });

  const normalizedPayload: NormalizedVocabSyncPayload = {
    externalId: normalizeOptionalText(input.values.external_id),
    inputText: normalizeOptionalText(input.values.input_text),
    normalizedText,
    pinyin: senses.pinyin,
    meaningsVi: senses.meaningsVi,
    hanViet: normalizeOptionalText(input.values.han_viet),
    traditionalVariant: normalizeOptionalText(input.values.traditional_variant),
    mainRadicals: normalizedMainRadicals,
    componentBreakdownJson: parseJsonValue(
      input.values.component_breakdown_json,
      "component_breakdown_json",
      parseErrors,
    ),
    radicalSummary: normalizeOptionalText(input.values.radical_summary),
    hskLevel: parseHskLevel(input.values.hsk_level, parseErrors),
    partOfSpeech: senses.partOfSpeech,
    topicTags: normalizedTopicTags,
    examples: senses.examples,
    similarChars: dedupePreserveOrder(splitPipeDelimited(input.values.similar_chars)),
    characterStructureType: normalizeLowercaseEnum(input.values.character_structure_type),
    structureExplanation: normalizeOptionalText(input.values.structure_explanation),
    mnemonic: normalizeOptionalText(input.values.mnemonic),
    notes: normalizedLegacyNotes,
    sourceConfidence: parseSourceConfidence(input.values.source_confidence, parseErrors),
    ambiguityFlag: parseBooleanValue(input.values.ambiguity_flag),
    ambiguityNote: normalizeOptionalText(input.values.ambiguity_note),
    readingCandidates: senses.readingCandidates,
    senses: senses.senses,
    senseSourceKeys: senses.senseSourceKeys,
    senseContentHashes: senses.senseContentHashes,
    senseSourceMode: senses.senseSourceMode,
    validationWarnings: senses.validationWarnings,
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
