import type { NormalizedVocabSyncPayload } from "@/features/vocabulary-sync/normalize";

function stripDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, (match) => (match === "đ" ? "d" : "D"));
}

function slugifySegment(value: string) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildWordSlugBase(payload: Pick<NormalizedVocabSyncPayload, "normalizedText" | "pinyin">) {
  const fromPinyin = payload.pinyin ? slugifySegment(payload.pinyin) : "";
  if (fromPinyin) {
    return fromPinyin;
  }

  const fromText = payload.normalizedText ? slugifySegment(payload.normalizedText) : "";
  if (fromText) {
    return fromText;
  }

  const codepointSlug = Array.from(payload.normalizedText ?? "word")
    .map((character) => character.codePointAt(0)?.toString(16) ?? "x")
    .join("-");

  return `word-${codepointSlug}`;
}
