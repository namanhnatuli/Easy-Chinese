import { NextRequest, NextResponse } from "next/server";

import { localeCookieName } from "@/i18n/config";
import { normalizeLocale } from "@/i18n/locale";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let payload: { locale?: string };

  try {
    payload = (await request.json()) as { locale?: string };
  } catch {
    return NextResponse.json({ message: "Invalid locale payload." }, { status: 400 });
  }

  const locale = normalizeLocale(payload.locale);
  const response = NextResponse.json({ ok: true, locale });

  response.cookies.set(localeCookieName, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return response;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_language: locale })
    .eq("id", user.id);

  if (error) {
    logger.error("locale_preference_update_failed", error, {
      userId: user.id,
      locale,
    });

    return NextResponse.json(
      { message: "Locale preference could not be saved." },
      { status: 500 },
    );
  }

  logger.info("locale_preference_updated", {
    userId: user.id,
    locale,
  });

  return response;
}
