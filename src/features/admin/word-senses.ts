import { z } from "zod";

import { optionalText } from "@/features/admin/shared-utils";
import { PART_OF_SPEECH_LIST } from "@/features/vocabulary-sync/constants";

const allowedPartOfSpeech = new Set(PART_OF_SPEECH_LIST);

export interface AdminWordExampleDraft {
  chineseText: string;
  pinyin: string;
  vietnameseMeaning: string;
}

export interface AdminWordSenseDraft {
  id: string | null;
  pinyin: string;
  partOfSpeech: string | null;
  meaningVi: string;
  usageNote: string | null;
  senseOrder: number;
  isPrimary: boolean;
  isPublished: boolean;
  examples: AdminWordExampleDraft[];
}

export interface AdminLegacySenseFallbackInput {
  wordId: string;
  pinyin: string;
  partOfSpeech: string | null;
  meaningVi: string;
  usageNote: string | null;
  isPublished: boolean;
  examples: Array<{
    chineseText: string;
    pinyin: string | null;
    vietnameseMeaning: string;
    senseId: string | null;
  }>;
}

export interface DerivedLegacyWordSummary {
  pinyin: string;
  vietnameseMeaning: string;
  meaningsVi: string;
  partOfSpeech: string | null;
  readingCandidates: string | null;
}

const adminWordExampleSchema = z.object({
  chineseText: z.string(),
  pinyin: z.string().optional().nullable(),
  vietnameseMeaning: z.string().optional().nullable(),
});

const adminWordSenseSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  pinyin: z.string(),
  partOfSpeech: z.string().optional().nullable(),
  meaningVi: z.string(),
  usageNote: z.string().optional().nullable(),
  senseOrder: z.number().int(),
  isPrimary: z.boolean(),
  isPublished: z.boolean(),
  examples: z.array(adminWordExampleSchema).default([]),
});

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePinyinPlain(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeExampleDraft(example: {
  chineseText: string;
  pinyin?: string | null;
  vietnameseMeaning?: string | null;
}) {
  return {
    chineseText: normalizeWhitespace(example.chineseText),
    pinyin: normalizeWhitespace(example.pinyin ?? ""),
    vietnameseMeaning: normalizeWhitespace(example.vietnameseMeaning ?? ""),
  } satisfies AdminWordExampleDraft;
}

function isEmptyExample(example: AdminWordExampleDraft) {
  return !example.chineseText && !example.pinyin && !example.vietnameseMeaning;
}

function normalizeSenseDraft(
  sense: z.infer<typeof adminWordSenseSchema>,
  index: number,
): AdminWordSenseDraft {
  const pinyin = normalizeWhitespace(sense.pinyin);
  const partOfSpeech = optionalText(sense.partOfSpeech ?? null);
  const normalizedPartOfSpeech =
    partOfSpeech && allowedPartOfSpeech.has(partOfSpeech) ? partOfSpeech : null;
  const meaningVi = normalizeWhitespace(sense.meaningVi);
  const usageNote = optionalText(sense.usageNote ?? null);
  const examples = sense.examples
    .map(normalizeExampleDraft)
    .filter((example) => !isEmptyExample(example));

  return {
    id: sense.id ?? null,
    pinyin,
    partOfSpeech: normalizedPartOfSpeech,
    meaningVi,
    usageNote,
    senseOrder: Number.isFinite(sense.senseOrder) ? sense.senseOrder : index + 1,
    isPrimary: sense.isPrimary,
    isPublished: sense.isPublished,
    examples,
  };
}

export function buildEditorSenses(input: {
  word: {
    id: string;
    pinyin: string;
    part_of_speech: string | null;
    vietnamese_meaning: string;
    notes: string | null;
    is_published: boolean;
  };
  senses: Array<{
    id: string;
    pinyin: string;
    part_of_speech: string | null;
    meaning_vi: string;
    usage_note: string | null;
    sense_order: number;
    is_primary: boolean;
    is_published: boolean;
  }>;
  examples: Array<{
    chineseText: string;
    pinyin: string | null;
    vietnameseMeaning: string;
    sortOrder: number;
    senseId: string | null;
  }>;
}) {
  if (input.senses.length === 0) {
    return [
      {
        id: null,
        pinyin: input.word.pinyin,
        partOfSpeech: input.word.part_of_speech,
        meaningVi: input.word.vietnamese_meaning,
        usageNote: input.word.notes,
        senseOrder: 1,
        isPrimary: true,
        isPublished: input.word.is_published,
        examples: input.examples.map((example) => ({
          chineseText: example.chineseText,
          pinyin: example.pinyin ?? "",
          vietnameseMeaning: example.vietnameseMeaning,
        })),
      } satisfies AdminWordSenseDraft,
    ];
  }

  const primarySenseId = input.senses.find((sense) => sense.is_primary)?.id ?? input.senses[0]?.id ?? null;

  return input.senses
    .slice()
    .sort((left, right) => left.sense_order - right.sense_order)
    .map((sense, index) => ({
      id: sense.id,
      pinyin: sense.pinyin,
      partOfSpeech: sense.part_of_speech,
      meaningVi: sense.meaning_vi,
      usageNote: sense.usage_note,
      senseOrder: index + 1,
      isPrimary: sense.is_primary,
      isPublished: sense.is_published,
      examples: input.examples
        .filter(
          (example) =>
            example.senseId === sense.id || (example.senseId === null && primarySenseId === sense.id),
        )
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((example) => ({
          chineseText: example.chineseText,
          pinyin: example.pinyin ?? "",
          vietnameseMeaning: example.vietnameseMeaning,
        })),
    }));
}

export function parseAdminSensesJson(value: string | null | undefined) {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(value ?? "[]");
  } catch {
    throw new Error("Senses payload must be valid JSON.");
  }

  const result = z.array(adminWordSenseSchema).safeParse(parsedValue);
  if (!result.success) {
    throw new Error("Senses payload is invalid.");
  }

  const normalizedSenses = result.data
    .map((sense, index) => normalizeSenseDraft(sense, index))
    .filter((sense) => sense.pinyin || sense.meaningVi || sense.examples.length > 0);

  if (normalizedSenses.length === 0) {
    throw new Error("At least one sense is required.");
  }

  normalizedSenses.forEach((sense, index) => {
    sense.senseOrder = index + 1;
  });

  const primarySenses = normalizedSenses.filter((sense) => sense.isPrimary);
  if (primarySenses.length !== 1) {
    throw new Error("Exactly one primary sense is required.");
  }

  const duplicateKeys = new Set<string>();
  for (const sense of normalizedSenses) {
    if (!sense.pinyin) {
      throw new Error("Each sense needs a pinyin value.");
    }

    if (!sense.meaningVi) {
      throw new Error("Each sense needs a Vietnamese meaning.");
    }

    const duplicateKey = `${sense.pinyin.toLowerCase()}::${sense.partOfSpeech ?? ""}`;
    if (duplicateKeys.has(duplicateKey)) {
      throw new Error("Duplicate pinyin + part of speech combinations are not allowed.");
    }
    duplicateKeys.add(duplicateKey);

    for (const example of sense.examples) {
      if (!example.chineseText) {
        throw new Error("Examples require Chinese text.");
      }
    }
  }

  return normalizedSenses;
}

export function deriveLegacyWordSummaryFromSenses(senses: AdminWordSenseDraft[]): DerivedLegacyWordSummary {
  const orderedSenses = senses.slice().sort((left, right) => left.senseOrder - right.senseOrder);
  const primarySense = orderedSenses.find((sense) => sense.isPrimary) ?? orderedSenses[0];
  const uniquePartsOfSpeech = Array.from(
    new Set(orderedSenses.map((sense) => sense.partOfSpeech).filter((value): value is string => Boolean(value))),
  );
  const uniqueReadings = Array.from(
    new Set(orderedSenses.map((sense) => sense.pinyin).filter(Boolean)),
  );
  const uniqueMeanings = Array.from(
    new Set(orderedSenses.map((sense) => sense.meaningVi).filter(Boolean)),
  );

  return {
    pinyin: primarySense?.pinyin ?? "",
    vietnameseMeaning: primarySense?.meaningVi ?? uniqueMeanings.join(" | "),
    meaningsVi: uniqueMeanings.join(" | "),
    partOfSpeech: uniquePartsOfSpeech.length > 0 ? uniquePartsOfSpeech.join("|") : null,
    readingCandidates: uniqueReadings.length > 0 ? uniqueReadings.join(" | ") : null,
  };
}

