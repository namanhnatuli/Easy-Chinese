import { createHash } from "node:crypto";

export interface TtsCacheKeyInput {
  provider: string;
  languageCode: string;
  voice: string;
  speakingRate: number;
  pitch: number;
  text: string;
}

export function normalizeTtsText(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function formatTtsNumber(value: number) {
  return value.toFixed(2);
}

export function createSha256Hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildTtsCacheKey(input: TtsCacheKeyInput) {
  const normalizedText = normalizeTtsText(input.text);
  const normalizedProvider = input.provider.trim().toLowerCase();
  const normalizedLanguageCode = input.languageCode.trim().toLowerCase();
  const normalizedVoice = input.voice.trim();
  const normalizedSpeakingRate = formatTtsNumber(input.speakingRate);
  const normalizedPitch = formatTtsNumber(input.pitch);
  const textHash = createSha256Hash(normalizedText);

  const cacheKeySource = [
    normalizedProvider,
    normalizedLanguageCode,
    normalizedVoice,
    normalizedSpeakingRate,
    normalizedPitch,
    normalizedText,
  ].join("|");

  return {
    cacheKey: createSha256Hash(cacheKeySource),
    textHash,
    normalizedText,
    normalizedProvider,
    normalizedLanguageCode,
    normalizedVoice,
    normalizedSpeakingRate,
    normalizedPitch,
  };
}

export function buildTtsStoragePath({
  languageCode,
  voice,
  cacheKey,
}: {
  languageCode: string;
  voice: string;
  cacheKey: string;
}) {
  const safeVoice = voice.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const safeLanguageCode = languageCode.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");

  return `tts/${safeLanguageCode}/${safeVoice}/${cacheKey}.mp3`;
}

export function buildTtsTextPreview(text: string, maxLength = 160) {
  const normalizedText = normalizeTtsText(text);
  return normalizedText.length <= maxLength
    ? normalizedText
    : `${normalizedText.slice(0, maxLength - 1)}…`;
}
