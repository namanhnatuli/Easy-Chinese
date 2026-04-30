import "server-only";

import { getServerEnv } from "@/lib/env";

import type { GeminiConfig, GeminiModelWeight } from "@/lib/ai/gemini-types";
import { GeminiServiceError } from "@/lib/ai/gemini-types";

const DEFAULT_GEMINI_MODEL_WEIGHTS: GeminiModelWeight[] = [
  { model: "gemini-3.1-flash-lite-preview", weight: 5 },
  { model: "gemini-2.5-flash", weight: 2 },
  { model: "gemini-2.5-flash-lite", weight: 1 },
  { model: "gemini-3-flash-preview", weight: 1 },
];

let cachedGeminiConfig: GeminiConfig | null = null;

function parseStringArray(value: string | undefined, fieldName: string) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  throw new GeminiServiceError(
    "invalid_config",
    `${fieldName} must be a JSON array of strings or a comma-separated string.`,
    { statusCode: 500 },
  );
}

function parseModelWeights(value: string | undefined) {
  if (!value) {
    return DEFAULT_GEMINI_MODEL_WEIGHTS;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new GeminiServiceError(
      "invalid_config",
      "GEMINI_MODEL_WEIGHTS must be valid JSON.",
      { statusCode: 500 },
    );
  }

  if (!Array.isArray(parsed)) {
    throw new GeminiServiceError(
      "invalid_config",
      "GEMINI_MODEL_WEIGHTS must be a JSON array.",
      { statusCode: 500 },
    );
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new GeminiServiceError(
        "invalid_config",
        `GEMINI_MODEL_WEIGHTS[${index}] must be an object.`,
        { statusCode: 500 },
      );
    }

    const model = typeof item.model === "string" ? item.model.trim() : "";
    const weight = typeof item.weight === "number" ? item.weight : Number(item.weight);

    if (!model) {
      throw new GeminiServiceError(
        "invalid_config",
        `GEMINI_MODEL_WEIGHTS[${index}].model is required.`,
        { statusCode: 500 },
      );
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      throw new GeminiServiceError(
        "invalid_config",
        `GEMINI_MODEL_WEIGHTS[${index}].weight must be a positive number.`,
        { statusCode: 500 },
      );
    }

    return { model, weight };
  });
}

function parsePositiveInteger(value: string | number | undefined, fallback: number, fieldName: string) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    if (value === undefined) {
      return fallback;
    }

    throw new GeminiServiceError(
      "invalid_config",
      `${fieldName} must be a positive number.`,
      { statusCode: 500 },
    );
  }

  return Math.floor(parsed);
}

function parseTemperature(value: string | number | undefined, fallback: number) {
  if (value === undefined) {
    return fallback;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new GeminiServiceError(
      "invalid_config",
      "GEMINI_DEFAULT_TEMPERATURE must be between 0 and 1.",
      { statusCode: 500 },
    );
  }

  return parsed;
}

export function resetGeminiConfigCache() {
  cachedGeminiConfig = null;
}

export function getGeminiConfig(): GeminiConfig {
  if (cachedGeminiConfig) {
    return cachedGeminiConfig;
  }

  const env = getServerEnv();
  const apiKeys = parseStringArray(env.GEMINI_API_KEYS, "GEMINI_API_KEYS");
  const modelWeights = parseModelWeights(env.GEMINI_MODEL_WEIGHTS);

  if (apiKeys.length === 0) {
    throw new GeminiServiceError(
      "invalid_config",
      "GEMINI_API_KEYS must include at least one API key.",
      { statusCode: 500 },
    );
  }

  if (modelWeights.length === 0) {
    throw new GeminiServiceError(
      "invalid_config",
      "GEMINI_MODEL_WEIGHTS must include at least one model.",
      { statusCode: 500 },
    );
  }

  const defaultMaxRetries = Math.max(1, Math.min(apiKeys.length, 3));

  cachedGeminiConfig = {
    apiKeys,
    modelWeights,
    maxRetries: parsePositiveInteger(env.GEMINI_MAX_RETRIES, defaultMaxRetries, "GEMINI_MAX_RETRIES"),
    timeoutMs: parsePositiveInteger(env.GEMINI_TIMEOUT_MS, 30_000, "GEMINI_TIMEOUT_MS"),
    defaultTemperature: parseTemperature(env.GEMINI_DEFAULT_TEMPERATURE, 0.4),
    defaultMaxOutputTokens: parsePositiveInteger(
      env.GEMINI_DEFAULT_MAX_OUTPUT_TOKENS,
      2_048,
      "GEMINI_DEFAULT_MAX_OUTPUT_TOKENS",
    ),
  };

  return cachedGeminiConfig;
}
