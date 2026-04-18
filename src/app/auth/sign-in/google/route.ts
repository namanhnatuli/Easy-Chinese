import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { sanitizeNextPath } from "@/features/auth/routes";
import { getPublicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const oauthRedirect = new URL("/", request.url);
  const response = NextResponse.redirect(oauthRedirect);
  const env = getPublicEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const callbackUrl = new URL("/auth/callback", request.url);

  if (next) {
    callbackUrl.searchParams.set("next", next);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    logger.error("auth_google_sign_in_start_failed", error ?? new Error("Missing Google OAuth URL."), {
      next,
    });
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  response.headers.set("Location", data.url);
  return response;
}
