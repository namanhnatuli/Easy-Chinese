import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { persistStudyOutcome } from "@/features/learning/persistence";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const reviewSubmissionSchema = z.object({
  lessonId: z.string().uuid().optional(),
  wordId: z.string().uuid(),
  mode: z.enum(["flashcard", "multiple_choice", "typing"]),
  result: z.enum(["correct", "incorrect", "skipped"]),
  grade: z.enum(["again", "hard", "good", "easy"]).optional(),
  completionPercent: z.number().min(0).max(100),
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  let payload: z.infer<typeof reviewSubmissionSchema>;

  try {
    payload = reviewSubmissionSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid review payload." }, { status: 400 });
  }

  try {
    await persistStudyOutcome({
      supabase,
      userId: user.id,
      input: payload,
    });

    logger.info("review_submission_succeeded", {
      userId: user.id,
      wordId: payload.wordId,
      lessonId: payload.lessonId ?? null,
      mode: payload.mode,
      result: payload.result,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to persist study progress.";

    logger.error("review_submission_failed", error, {
      userId: user.id,
      wordId: payload.wordId,
      lessonId: payload.lessonId ?? null,
      mode: payload.mode,
      result: payload.result,
    });

    return NextResponse.json({ message }, { status: 500 });
  }
}
