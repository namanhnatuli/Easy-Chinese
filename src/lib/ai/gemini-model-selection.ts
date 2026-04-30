import type { GeminiConfig, GeminiModelWeight } from "@/lib/ai/gemini-types";

let currentModelPointer = 0;

function buildWeightedModelPool(modelWeights: GeminiModelWeight[]) {
  return modelWeights.flatMap((entry) =>
    Array.from({ length: Math.max(1, Math.round(entry.weight * 100)) }, () => entry.model),
  );
}

export function resetGeminiModelSelection() {
  currentModelPointer = 0;
}

export function getNextWeightedGeminiModel(config: Pick<GeminiConfig, "modelWeights">) {
  const pool = buildWeightedModelPool(config.modelWeights);
  const model = pool[currentModelPointer % pool.length];
  currentModelPointer = (currentModelPointer + 1) % pool.length;
  return model;
}
