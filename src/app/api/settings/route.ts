import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { userSettingsSchema } from "@/features/settings/schema";
import { updateUserSettings } from "@/features/settings/profile";
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
    });

    return NextResponse.json({ ok: true });
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
