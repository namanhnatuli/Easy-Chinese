import { NextResponse } from "next/server";

import { getProfileForUserId } from "@/features/auth/profile";
import { getTtsConfig } from "@/features/tts/config";
import { isTtsServiceError } from "@/features/tts/errors";
import { resolveTtsAudio } from "@/features/tts/service";
import { ttsResolveRequestSchema } from "@/features/tts/schema";
import { logger } from "@/lib/logger";
import { checkBestEffortRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getRequestIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "anonymous";
}

export async function POST(request: Request) {
  try {
    const config = getTtsConfig();
    const identifier = getRequestIdentifier(request);
    const requestLimit = config.anonymousRequestLimitPerMinute ?? 30;
    const rateLimit = checkBestEffortRateLimit({
      key: `tts:${identifier}`,
      limit: requestLimit,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      logger.warn("tts_quota_or_rate_limited", {
        identifier,
        requestLimit,
      });

      return NextResponse.json(
        {
          code: "quota_or_rate_limited",
          message: "Too many pronunciation requests. Please try again shortly.",
        },
        { status: 429 },
      );
    }

    const json = await request.json();
    const payload = ttsResolveRequestSchema.parse(json);
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const profile = user ? await getProfileForUserId(supabase, user.id) : null;

    const lookup = await resolveTtsAudio(payload, {
      provider: profile?.preferredTtsProvider,
      voice: profile?.preferredTtsVoice,
    });

    return NextResponse.json({
      audioUrl: lookup.audioUrl,
      cacheHit: lookup.cacheStatus === "hit",
      cacheKey: lookup.request.cacheKey,
      mimeType: lookup.cacheEntry?.mime_type ?? "audio/mpeg",
      characterCount: lookup.request.characterCount,
    });
  } catch (error) {
    logger.error("tts_resolve_failed", error);

    if (isTtsServiceError(error)) {
      if (error.code === "quota_or_rate_limited") {
        logger.warn("tts_quota_or_rate_limited", {
          message: error.message,
        });
      }

      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        code: "provider_failed",
        message: "Unable to resolve TTS audio.",
      },
      { status: 500 },
    );
  }
}
