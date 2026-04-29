import { z } from "zod";

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
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON,
    GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_DEFAULT_SPREADSHEET_ID,
    GOOGLE_SHEETS_DEFAULT_SHEET_NAME: process.env.GOOGLE_SHEETS_DEFAULT_SHEET_NAME,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  });

  return cachedServerEnv;
}
