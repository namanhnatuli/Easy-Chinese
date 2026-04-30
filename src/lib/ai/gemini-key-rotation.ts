import type { GeminiConfig } from "@/lib/ai/gemini-types";

let currentKeyPointer = 0;

export function resetGeminiKeyRotation() {
  currentKeyPointer = 0;
}

export function getNextGeminiKey(config: Pick<GeminiConfig, "apiKeys">) {
  const keyIndex = currentKeyPointer % config.apiKeys.length;
  currentKeyPointer = (currentKeyPointer + 1) % config.apiKeys.length;

  return {
    key: config.apiKeys[keyIndex],
    keyIndex,
  };
}
