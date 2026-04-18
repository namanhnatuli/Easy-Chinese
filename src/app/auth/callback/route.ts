import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { ensureProfileForUser } from "@/features/auth/profile";
import { getDefaultAuthenticatedPath, sanitizeNextPath } from "@/features/auth/routes";
import { getPublicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const redirectDestination = new URL("/", request.url);
  const response = NextResponse.redirect(redirectDestination);

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
            request.cookies.set(name, value);
            response.cookies.set({
              name,
              value,
              ...options,
            } as any);
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error("auth_callback_exchange_failed", error, {
        next,
      });
      return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn("auth_callback_missing_user", {
      next,
    });
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  const profile = await ensureProfileForUser(supabase, user);
  const destination = next ?? getDefaultAuthenticatedPath(profile.role);

  logger.info("auth_callback_completed", {
    userId: user.id,
    role: profile.role,
    destination,
  });

  response.headers.set("Location", new URL(destination, request.url).toString());
  return response;
}
