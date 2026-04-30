import assert from "node:assert/strict";
import test from "node:test";

import { getNextWeightedGeminiModel, resetGeminiModelSelection } from "@/lib/ai/gemini-model-selection";

test.afterEach(() => {
  resetGeminiModelSelection();
});

test("getNextWeightedGeminiModel follows weighted round-robin distribution", () => {
  const config = {
    modelWeights: [
      { model: "model-a", weight: 3 },
      { model: "model-b", weight: 1 },
    ],
  };

  const picks = Array.from({ length: 400 }, () => getNextWeightedGeminiModel(config));
  const counts = picks.reduce<Record<string, number>>((accumulator, model) => {
    accumulator[model] = (accumulator[model] ?? 0) + 1;
    return accumulator;
  }, {});

  assert.equal(counts["model-a"], 300);
  assert.equal(counts["model-b"], 100);
});
