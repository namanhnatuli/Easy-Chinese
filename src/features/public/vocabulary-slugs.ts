function normalizeSlugText(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[/?#%\\]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, (match) => (match === "đ" ? "d" : "D"));
}

export function buildLegacyPinyinSlug(pinyin: string | null | undefined) {
  if (!pinyin) {
    return "";
  }

  return stripDiacritics(pinyin)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildWordSlugBase(input: {
  normalizedText?: string | null;
  hanzi?: string | null;
  simplified?: string | null;
}) {
  for (const candidate of [input.normalizedText, input.hanzi, input.simplified]) {
    if (!candidate) {
      continue;
    }

    const baseSlug = normalizeSlugText(candidate);
    if (baseSlug) {
      return baseSlug;
    }
  }

  const fallbackText = input.hanzi ?? input.simplified ?? "word";
  const codepointSlug = Array.from(fallbackText || "word")
    .map((character) => character.codePointAt(0)?.toString(16) ?? "x")
    .join("-");

  return `word-${codepointSlug}`;
}

export function buildUniqueWordSlug(
  input: {
    normalizedText?: string | null;
    hanzi?: string | null;
    simplified?: string | null;
  },
  existingSlugs: Iterable<string>,
) {
  const baseSlug = buildWordSlugBase(input);
  const existing = new Set(existingSlugs);

  if (!existing.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (existing.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

export function encodeVocabularySlugSegment(slug: string) {
  return encodeURIComponent(slug);
}

export function buildVocabularyDetailPath(slug: string, params?: { sense?: string | null }) {
  const searchParams = new URLSearchParams();

  if (params?.sense) {
    searchParams.set("sense", params.sense);
  }

  const query = searchParams.toString();
  return `/vocabulary/${encodeVocabularySlugSegment(slug)}${query ? `?${query}` : ""}`;
}

export function decodeVocabularySlugSegment(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}
