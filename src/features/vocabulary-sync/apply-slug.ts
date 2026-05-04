import { buildWordSlugBase as buildHanziWordSlugBase } from "@/features/public/vocabulary-slugs";
import type { NormalizedVocabSyncPayload } from "@/features/vocabulary-sync/types";

export function buildWordSlugBase(payload: Pick<NormalizedVocabSyncPayload, "normalizedText" | "pinyin">) {
  return buildHanziWordSlugBase({ normalizedText: payload.normalizedText });
}
