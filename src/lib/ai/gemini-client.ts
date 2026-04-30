import "server-only";

import { getGeminiConfig } from "@/lib/ai/gemini-config";
import { getNextGeminiKey } from "@/lib/ai/gemini-key-rotation";
import { getNextWeightedGeminiModel } from "@/lib/ai/gemini-model-selection";
import {
  type GeminiGenerateRequest,
  type GeminiGenerateResult,
  GeminiServiceError,
} from "@/lib/ai/gemini-types";
import { logger } from "@/lib/logger";

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function buildContents(request: GeminiGenerateRequest) {
  if (request.messages && request.messages.length > 0) {
    return request.messages;
  }

  return [
    {
      role: "user" as const,
      parts: [{ text: request.prompt ?? "" }],
    },
  ];
}

function extractCandidateText(body: GeminiApiResponse) {
  const firstCandidate = body.candidates?.[0];
  const parts = firstCandidate?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (body.promptFeedback?.blockReason || firstCandidate?.finishReason === "SAFETY") {
    throw new GeminiServiceError(
      "safety_blocked",
      "Gemini blocked the request because of safety filters.",
      { statusCode: 400, retryable: false },
    );
  }

  if (!text) {
    throw new GeminiServiceError(
      "provider_error",
      "Gemini response did not include text output.",
      { statusCode: 502, retryable: true },
    );
  }

  return text;
}

function classifyGeminiFailure(error: unknown) {
  if (error instanceof GeminiServiceError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new GeminiServiceError("timeout", "Gemini request timed out.", {
      statusCode: 504,
      retryable: true,
    });
  }

  if (error instanceof Error) {
    return new GeminiServiceError("provider_error", error.message, {
      statusCode: 502,
      retryable: true,
    });
  }

  return new GeminiServiceError("provider_error", "Unknown Gemini provider error.", {
    statusCode: 502,
    retryable: true,
  });
}

async function executeGeminiRequest(params: {
  request: GeminiGenerateRequest;
  model: string;
  apiKey: string;
  keyIndex: number;
  attempt: number;
}) {
  const config = getGeminiConfig();
  const startedAt = Date.now();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: params.request.systemInstruction
            ? {
                parts: [{ text: params.request.systemInstruction }],
              }
            : undefined,
          contents: buildContents(params.request),
          generationConfig: {
            temperature: params.request.temperature ?? config.defaultTemperature,
            maxOutputTokens: params.request.maxOutputTokens ?? config.defaultMaxOutputTokens,
            responseMimeType: params.request.responseMimeType ?? "text/plain",
          },
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      },
    );

    const body = (await response.json().catch(() => ({}))) as GeminiApiResponse;

    if (!response.ok) {
      const status = body.error?.status ?? "";
      const message = body.error?.message ?? `Gemini request failed with status ${response.status}.`;

      if (response.status === 400 || status === "INVALID_ARGUMENT") {
        throw new GeminiServiceError("invalid_input", message, { statusCode: 400, retryable: false });
      }

      if (response.status === 403 || status === "PERMISSION_DENIED") {
        throw new GeminiServiceError("auth_error", message, { statusCode: 403, retryable: false });
      }

      if (response.status === 429 || status === "RESOURCE_EXHAUSTED") {
        throw new GeminiServiceError("rate_limited", message, { statusCode: 429, retryable: true });
      }

      if (response.status === 503 || status === "UNAVAILABLE") {
        throw new GeminiServiceError("provider_error", message, { statusCode: 503, retryable: true });
      }

      if (response.status === 504 || status === "DEADLINE_EXCEEDED") {
        throw new GeminiServiceError("timeout", message, { statusCode: 504, retryable: true });
      }

      if (response.status >= 500) {
        throw new GeminiServiceError("provider_error", message, { statusCode: response.status, retryable: true });
      }

      throw new GeminiServiceError("provider_error", message, { statusCode: response.status, retryable: false });
    }

    const text = extractCandidateText(body);
    const latencyMs = Date.now() - startedAt;
    logger.info("gemini_request_succeeded", {
      feature: params.request.feature,
      model: params.model,
      keyIndex: params.keyIndex,
      attempt: params.attempt,
      latencyMs,
    });

    return {
      text,
      model: params.model,
      keyIndex: params.keyIndex,
      raw: body,
    } satisfies GeminiGenerateResult;
  } catch (error) {
    const classifiedError = classifyGeminiFailure(error);
    logger.warn("gemini_request_failed", {
      feature: params.request.feature,
      model: params.model,
      keyIndex: params.keyIndex,
      attempt: params.attempt,
      errorCode: classifiedError.code,
      message: classifiedError.message,
    });
    throw classifiedError;
  }
}

export async function generateGeminiContent(request: GeminiGenerateRequest): Promise<GeminiGenerateResult> {
  const config = getGeminiConfig();
  const maxAttempts = Math.max(1, Math.min(config.apiKeys.length, config.maxRetries + 1));

  let lastError: GeminiServiceError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { key, keyIndex } = getNextGeminiKey(config);
    const model = request.modelOverride ?? getNextWeightedGeminiModel(config);

    try {
      return await executeGeminiRequest({
        request,
        model,
        apiKey: key,
        keyIndex,
        attempt,
      });
    } catch (error) {
      const geminiError = classifyGeminiFailure(error);
      lastError = geminiError;
      const shouldRetryWithNextKey =
        geminiError.retryable || (geminiError.code === "auth_error" && attempt < maxAttempts - 1);

      if (!shouldRetryWithNextKey || attempt === maxAttempts - 1) {
        break;
      }
    }
  }

  throw lastError ?? new GeminiServiceError("provider_error", "Gemini request failed.", { retryable: false });
}
