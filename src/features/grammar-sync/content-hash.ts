import { hashVocabularyPayload } from "@/features/vocabulary-sync/content-hash";
import type { NormalizedGrammarSyncPayload } from "@/features/grammar-sync/types";

export function buildGrammarContentHash(payload: NormalizedGrammarSyncPayload) {
  const stablePayload = {
    title: payload.title,
    slug: payload.slug,
    structureText: payload.structureText,
    explanationVi: payload.explanationVi,
    notes: payload.notes,
    examples: payload.examples
      .map((example) => ({
        chineseText: example.chineseText,
        pinyin: example.pinyin,
        vietnameseMeaning: example.vietnameseMeaning,
        sortOrder: example.sortOrder,
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder),
    hskLevel: payload.hskLevel,
    sourceConfidence: payload.sourceConfidence,
    ambiguityFlag: payload.ambiguityFlag,
    ambiguityNote: payload.ambiguityNote,
    reviewStatus: payload.reviewStatus,
    aiStatus: payload.aiStatus,
  };

  return hashVocabularyPayload(stablePayload);
}
