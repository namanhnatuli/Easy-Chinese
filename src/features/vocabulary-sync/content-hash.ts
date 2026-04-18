import { createHash } from "node:crypto";

export interface WordContentHashInput {
  normalizedText: string;
  pinyin: string | null;
  meaningsVi: string | null;
  hanViet: string | null;
  traditionalVariant: string | null;
  hskLevel: number | null;
  partOfSpeech: string | null;
  componentBreakdownJson: unknown;
  radicalSummary: string | null;
  mnemonic: string | null;
  characterStructureType: string | null;
  structureExplanation: string | null;
  notes: string | null;
  ambiguityFlag: boolean;
  ambiguityNote: string | null;
  readingCandidates: string | null;
  mainRadicals?: string[];
  topicTags?: string[];
  examples?: Array<{
    chineseText: string;
    pinyin: string | null;
    vietnameseMeaning: string;
  }>;
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = normalizeValue((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

export function stableStringify(value: unknown) {
  return JSON.stringify(normalizeValue(value));
}

export function hashVocabularyPayload(payload: unknown) {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

export function buildWordContentHash(input: WordContentHashInput) {
  return hashVocabularyPayload({
    ...input,
    mainRadicals: [...(input.mainRadicals ?? [])].sort(),
    topicTags: [...(input.topicTags ?? [])].sort(),
    examples: (input.examples ?? []).map((example) => ({
      chineseText: example.chineseText,
      pinyin: example.pinyin,
      vietnameseMeaning: example.vietnameseMeaning,
    })),
  });
}
