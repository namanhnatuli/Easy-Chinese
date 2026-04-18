import "server-only";

import { createSign } from "node:crypto";

import { getServerEnv } from "@/lib/env";

export interface GoogleServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
}

interface CachedGoogleToken {
  accessToken: string;
  expiresAt: number;
}

const GOOGLE_TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

let cachedGoogleToken: CachedGoogleToken | null = null;

function base64UrlEncode(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n").trim();
}

export function getGoogleServiceAccountCredentials(): GoogleServiceAccountCredentials {
  const env = getServerEnv();

  if (env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON) {
    const parsed = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON) as {
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON must include client_email and private_key.");
    }

    return {
      clientEmail: parsed.client_email,
      privateKey: normalizePrivateKey(parsed.private_key),
    };
  }

  if (!env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error(
      "Google Sheets credentials are missing. Set GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON or both GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  return {
    clientEmail: env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
  };
}

function createGoogleJwtAssertion(credentials: GoogleServiceAccountCredentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: credentials.clientEmail,
    scope: GOOGLE_SHEETS_READONLY_SCOPE,
    aud: GOOGLE_TOKEN_AUDIENCE,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  const signature = signer
    .sign(credentials.privateKey)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${unsignedToken}.${signature}`;
}

export async function getGoogleSheetsAccessToken() {
  const now = Date.now();
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > now + 60_000) {
    return cachedGoogleToken.accessToken;
  }

  const credentials = getGoogleServiceAccountCredentials();
  const assertion = createGoogleJwtAssertion(credentials);

  const response = await fetch(GOOGLE_TOKEN_AUDIENCE, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Google OAuth token exchange failed: ${response.status} ${responseText}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedGoogleToken = {
    accessToken: payload.access_token,
    expiresAt: now + payload.expires_in * 1000,
  };

  return payload.access_token;
}
