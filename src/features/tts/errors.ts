export type TtsServiceErrorCode =
  | "provider_not_configured"
  | "invalid_input"
  | "provider_failed"
  | "quota_or_rate_limited";

export class TtsServiceError extends Error {
  code: TtsServiceErrorCode;
  statusCode: number;

  constructor(code: TtsServiceErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = "TtsServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function createTtsServiceError(
  code: TtsServiceErrorCode,
  message: string,
) {
  const statusCode =
    code === "invalid_input"
      ? 400
      : code === "provider_not_configured"
        ? 503
        : code === "quota_or_rate_limited"
          ? 429
          : 502;

  return new TtsServiceError(code, message, statusCode);
}

export function isTtsServiceError(error: unknown): error is TtsServiceError {
  return error instanceof TtsServiceError;
}
