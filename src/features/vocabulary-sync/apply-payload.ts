import type { NormalizedVocabSyncPayload } from "@/features/vocabulary-sync/types";

export function resolveEffectiveInputTextForApply(
  payload: Pick<NormalizedVocabSyncPayload, "inputText" | "normalizedText">,
) {
  return payload.inputText ?? payload.normalizedText ?? null;
}
