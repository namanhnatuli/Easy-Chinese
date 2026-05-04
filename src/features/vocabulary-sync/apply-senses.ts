import type { NormalizedVocabSyncPayload } from "@/features/vocabulary-sync/types";
import { buildWordContentHash } from "@/features/vocabulary-sync/content-hash";

export interface ApplyResolvedSense {
  pinyin: string;
  partOfSpeech: string | null;
  meaningVi: string;
  usageNote: string | null;
  senseOrder: number;
  isPrimary: boolean;
  examples: Array<{
    cn: string;
    py: string | null;
    vi: string;
  }>;
  sourceKey: string;
  contentHash: string;
}

export function buildSenseSourceKeyForApply(input: {
  normalizedText: string | null;
  pinyin: string;
  partOfSpeech: string | null;
}) {
  return [
    input.normalizedText,
    input.pinyin.toLowerCase(),
    input.partOfSpeech?.toLowerCase() ?? "",
  ].join("::");
}

export function buildSenseContentHashForApply(sense: {
  pinyin: string;
  partOfSpeech: string | null;
  meaningVi: string;
  usageNote: string | null;
  senseOrder: number;
  isPrimary: boolean;
  examples: Array<{
    cn: string;
    py: string | null;
    vi: string;
  }>;
}) {
  return buildWordContentHash({
    normalizedText: sense.meaningVi,
    pinyin: sense.pinyin,
    meaningsVi: sense.meaningVi,
    hanViet: null,
    traditionalVariant: null,
    hskLevel: null,
    partOfSpeech: sense.partOfSpeech,
    componentBreakdownJson: null,
    radicalSummary: null,
    mnemonic: null,
    characterStructureType: null,
    structureExplanation: null,
    notes: sense.usageNote,
    ambiguityFlag: false,
    ambiguityNote: null,
    readingCandidates: null,
    examples: sense.examples.map((example) => ({
      chineseText: example.cn,
      pinyin: example.py,
      vietnameseMeaning: example.vi,
    })),
  });
}

export function resolveApplySenses(payload: NormalizedVocabSyncPayload): ApplyResolvedSense[] {
  const fallbackSense =
    payload.senses.length === 0 && payload.pinyin && payload.meaningsVi
      ? [
          {
            pinyin: payload.pinyin,
            partOfSpeech: payload.partOfSpeech,
            meaningVi: payload.meaningsVi,
            usageNote: payload.notes,
            senseOrder: 1,
            isPrimary: true,
            examples: payload.examples.map((example) => ({
              cn: example.chineseText,
              py: example.pinyin,
              vi: example.vietnameseMeaning,
            })),
          },
        ]
      : [];

  const senses = payload.senses.length > 0 ? payload.senses : fallbackSense;

  return senses
    .map((sense, index) => ({
      ...sense,
      sourceKey:
        payload.senseSourceKeys[index] ??
        buildSenseSourceKeyForApply({
          normalizedText: payload.normalizedText,
          pinyin: sense.pinyin,
          partOfSpeech: sense.partOfSpeech,
        }),
      contentHash: payload.senseContentHashes[index] ?? buildSenseContentHashForApply(sense),
    }))
    .sort((left, right) => left.senseOrder - right.senseOrder);
}
