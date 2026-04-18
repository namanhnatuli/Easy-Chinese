import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ensureProfileForUser } from "@/features/auth/profile";
import {
  getDefaultAuthenticatedPath,
  getRequiredPermissionForPath,
  isAuthPage,
} from "@/features/auth/routes";
import { defaultLocale, localeCookieName, localeHeaderName } from "@/i18n/config";
import { resolveRequestLocale } from "@/i18n/locale";
import { localizePathname, shouldBypassLocale, stripLocaleFromPathname } from "@/i18n/navigation";
import { getPublicEnv } from "@/lib/env";
import { hasPermission } from "@/lib/permissions";

export async function middleware(request: NextRequest) {
  if (shouldBypassLocale(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const env = getPublicEnv();
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  const strippedPathname = stripLocaleFromPathname(pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await ensureProfileForUser(supabase, user) : null;
  const locale = resolveRequestLocale({
    pathnameLocale: pathname === strippedPathname ? null : pathname.split("/")[1],
    profileLocale: profile?.preferredLanguage ?? null,
    cookieLocale: request.cookies.get(localeCookieName)?.value ?? null,
  });

  response.cookies.set(localeCookieName, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  if (pathname === strippedPathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = localizePathname(strippedPathname, locale);
    return NextResponse.redirect(redirectUrl);
  }

  requestHeaders.set(localeHeaderName, locale);

  const requiredPermission = getRequiredPermissionForPath(strippedPathname);

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = strippedPathname;
  const localizedResponse = NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.getAll().forEach((cookie) => {
    localizedResponse.cookies.set(cookie);
  });
  localizedResponse.cookies.set(localeCookieName, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  if (isAuthPage(strippedPathname) && user) {
    return NextResponse.redirect(
      new URL(localizePathname(getDefaultAuthenticatedPath(profile?.role ?? "user"), locale), request.url),
    );
  }

  if (!requiredPermission) {
    return localizedResponse;
  }

  if (!user) {
    const signInUrl = new URL(localizePathname("/auth/sign-in", locale), request.url);
    const next = `${pathname}${request.nextUrl.search}`;
    signInUrl.searchParams.set("next", next);
    return NextResponse.redirect(signInUrl);
  }

  const role = profile?.role ?? "user";

  if (!hasPermission(role, requiredPermission)) {
    return NextResponse.redirect(
      new URL(localizePathname(getDefaultAuthenticatedPath(role), locale), request.url),
    );
  }

  return localizedResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
