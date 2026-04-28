type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (error && typeof error === "object") {
    // Check if it's a Supabase/Postgrest error or a custom error object
    const obj = error as Record<string, unknown>;
    if (obj.message || obj.code || obj.details) {
      return {
        message: obj.message ?? String(error),
        code: obj.code,
        details: obj.details,
        hint: obj.hint,
      };
    }
  }

  return error;
}

function writeLog(level: LogLevel, event: string, context: LogContext = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  };

  const method = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  method(JSON.stringify(payload));
}

export const logger = {
  info(event: string, context?: LogContext) {
    writeLog("info", event, context);
  },
  warn(event: string, context?: LogContext) {
    writeLog("warn", event, context);
  },
  error(event: string, error: unknown, context?: LogContext) {
    writeLog("error", event, {
      ...context,
      error: serializeError(error),
    });
  },
};
