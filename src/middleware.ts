import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ensureProfileForUser } from "@/features/auth/profile";
import {
  getDefaultAuthenticatedPath,
  getRequiredPermissionForPath,
  isAuthPage,
} from "@/features/auth/routes";
import { getPublicEnv } from "@/lib/env";
import { hasPermission } from "@/lib/permissions";

export async function middleware(request: NextRequest) {
  const env = getPublicEnv();
  const response = NextResponse.next({
    request,
  });

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
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await ensureProfileForUser(supabase, user) : null;

  const requiredPermission = getRequiredPermissionForPath(request.nextUrl.pathname);

  if (isAuthPage(request.nextUrl.pathname) && user) {
    return NextResponse.redirect(new URL(getDefaultAuthenticatedPath(profile?.role ?? "user"), request.url));
  }

  if (!requiredPermission) {
    return response;
  }

  if (!user) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    signInUrl.searchParams.set("next", next);
    return NextResponse.redirect(signInUrl);
  }

  const role = profile?.role ?? "user";

  if (!hasPermission(role, requiredPermission)) {
    return NextResponse.redirect(new URL(getDefaultAuthenticatedPath(role), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
