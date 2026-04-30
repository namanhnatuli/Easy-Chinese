export type GeminiModelWeight = {
  model: string;
  weight: number;
};

export type GeminiResponseMimeType = "text/plain" | "application/json";

export interface GeminiConfig {
  apiKeys: string[];
  modelWeights: GeminiModelWeight[];
  maxRetries: number;
  timeoutMs: number;
  defaultTemperature: number;
  defaultMaxOutputTokens: number;
}

export interface GeminiMessagePart {
  text: string;
}

export interface GeminiMessage {
  role?: "user" | "model";
  parts: GeminiMessagePart[];
}

export interface GeminiGenerateRequest {
  feature: string;
  prompt?: string;
  messages?: GeminiMessage[];
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: GeminiResponseMimeType;
  modelOverride?: string;
  metadata?: Record<string, unknown>;
}

export interface GeminiGenerateResult {
  text: string;
  model: string;
  keyIndex: number;
  raw?: unknown;
}

export type GeminiErrorCode =
  | "invalid_config"
  | "invalid_input"
  | "auth_error"
  | "rate_limited"
  | "provider_error"
  | "timeout"
  | "safety_blocked";

export class GeminiServiceError extends Error {
  code: GeminiErrorCode;
  statusCode: number;
  retryable: boolean;

  constructor(code: GeminiErrorCode, message: string, options?: { statusCode?: number; retryable?: boolean }) {
    super(message);
    this.name = "GeminiServiceError";
    this.code = code;
    this.statusCode = options?.statusCode ?? 500;
    this.retryable = options?.retryable ?? false;
  }
}
