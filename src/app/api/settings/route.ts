import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { userSettingsSchema } from "@/features/settings/schema";
import { updateUserSettings } from "@/features/settings/profile";
import { localeCookieName } from "@/i18n/config";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  let payload: z.infer<typeof userSettingsSchema>;

  try {
    payload = userSettingsSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid settings payload." }, { status: 400 });
  }

  try {
    await updateUserSettings({
      supabase,
      userId: user.id,
      input: payload,
    });

    logger.info("settings_updated", {
      userId: user.id,
      theme: payload.theme,
      font: payload.font,
      language: payload.language,
      dailyGoal: payload.dailyGoal,
      schedulerType: payload.schedulerType,
      desiredRetention: payload.desiredRetention,
      maximumIntervalDays: payload.maximumIntervalDays,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(localeCookieName, payload.language, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    logger.error("settings_update_failed", error, {
      userId: user.id,
    });

    return NextResponse.json(
      { message: "Settings could not be saved." },
      { status: 500 },
    );
  }
}
