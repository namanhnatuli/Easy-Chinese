import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { sanitizeNextPath } from "@/features/auth/routes";

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
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
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  return NextResponse.redirect(data.url);
}
