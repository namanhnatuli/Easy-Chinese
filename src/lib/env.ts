import { z } from "zod";

function normalizeOptionalEnv(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required."),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Chinese Learning App"),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().min(2).default("en"),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  OPENAI_API_KEY: z.string().min(20).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  ADMIN_EMAILS: z.string().optional(),
  TTS_DEFAULT_SPEAKING_RATE: z.coerce.number().min(0.25).max(4).optional(),
  TTS_DEFAULT_PITCH: z.coerce.number().min(-20).max(20).optional(),
  TTS_STORAGE_BUCKET: z.string().min(1).optional(),
  TTS_STORAGE_ACCESS: z.enum(["public", "private"]).optional(),
  TTS_MAX_CHARACTERS_PER_REQUEST: z.coerce.number().int().min(1).max(5_000).optional(),
  TTS_ALLOWED_LANGUAGE_CODES: z.string().optional(),
  TTS_ANONYMOUS_REQUEST_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(10_000).optional(),
  AZURE_SPEECH_KEY: z.string().min(20).optional(),
  AZURE_SPEECH_REGION: z.string().min(1).optional(),
  GOOGLE_TTS_API_KEY: z.string().min(20).optional(),
  GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL: z.string().email().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(20).optional(),
  GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID: z.string().min(1).optional(),
  GOOGLE_SHEETS_DEFAULT_SHEET_NAME: z.string().min(1).optional(),
});

let cachedPublicEnv: z.infer<typeof publicEnvSchema> | null = null;
let cachedServerEnv: z.infer<typeof serverEnvSchema> | null = null;

export function resetEnvCache() {
  cachedPublicEnv = null;
  cachedServerEnv = null;
}

export function getPublicEnv() {
  cachedPublicEnv ??= publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  });

  return cachedPublicEnv;
}

export function getServerEnv() {
  cachedServerEnv ??= serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: normalizeOptionalEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
    OPENAI_API_KEY: normalizeOptionalEnv(process.env.OPENAI_API_KEY),
    OPENAI_MODEL: normalizeOptionalEnv(process.env.OPENAI_MODEL),
    OPENAI_BASE_URL: normalizeOptionalEnv(process.env.OPENAI_BASE_URL),
    ADMIN_EMAILS: normalizeOptionalEnv(process.env.ADMIN_EMAILS),
    TTS_DEFAULT_SPEAKING_RATE: normalizeOptionalEnv(process.env.TTS_DEFAULT_SPEAKING_RATE),
    TTS_DEFAULT_PITCH: normalizeOptionalEnv(process.env.TTS_DEFAULT_PITCH),
    TTS_STORAGE_BUCKET: normalizeOptionalEnv(process.env.TTS_STORAGE_BUCKET),
    TTS_STORAGE_ACCESS: normalizeOptionalEnv(process.env.TTS_STORAGE_ACCESS),
    TTS_MAX_CHARACTERS_PER_REQUEST: normalizeOptionalEnv(process.env.TTS_MAX_CHARACTERS_PER_REQUEST),
    TTS_ALLOWED_LANGUAGE_CODES: normalizeOptionalEnv(process.env.TTS_ALLOWED_LANGUAGE_CODES),
    TTS_ANONYMOUS_REQUEST_LIMIT_PER_MINUTE: normalizeOptionalEnv(process.env.TTS_ANONYMOUS_REQUEST_LIMIT_PER_MINUTE),
    AZURE_SPEECH_KEY: normalizeOptionalEnv(process.env.AZURE_SPEECH_KEY),
    AZURE_SPEECH_REGION: normalizeOptionalEnv(process.env.AZURE_SPEECH_REGION),
    GOOGLE_TTS_API_KEY: normalizeOptionalEnv(process.env.GOOGLE_TTS_API_KEY),
    GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON: normalizeOptionalEnv(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON),
    GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL: normalizeOptionalEnv(process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL),
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: normalizeOptionalEnv(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
    GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID: normalizeOptionalEnv(process.env.GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID),
    GOOGLE_SHEETS_DEFAULT_SHEET_NAME: normalizeOptionalEnv(process.env.GOOGLE_SHEETS_DEFAULT_SHEET_NAME),
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  });

  return cachedServerEnv;
}
