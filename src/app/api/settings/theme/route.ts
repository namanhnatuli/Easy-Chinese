import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { updateUserThemePreference } from "@/features/settings/profile";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const themeSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  let payload: z.infer<typeof themeSchema>;

  try {
    payload = themeSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid theme payload." }, { status: 400 });
  }

  try {
    await updateUserThemePreference({
      userId: user.id,
      theme: payload.theme,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("theme_update_failed", error, { userId: user.id });

    return NextResponse.json(
      { message: "Theme could not be updated." },
      { status: 500 },
    );
  }
}
