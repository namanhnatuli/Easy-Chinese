import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { evaluateListeningDictationAnswer } from "@/features/listening/evaluation";
import { persistListeningPracticeOutcome } from "@/features/listening/persistence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const listeningPracticeSchema = z
  .object({
    ttsAudioCacheId: z.string().uuid(),
    answer: z.string().trim().max(500),
    hintUsed: z.boolean().default(false),
    skipped: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (!value.skipped && value.answer.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Answer is required when the item is not skipped.",
        path: ["answer"],
      });
    }
  });

const listeningEvaluationSchema = z.object({
  expected: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(500),
  hintUsed: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  let payload: z.infer<typeof listeningPracticeSchema>;

  try {
    payload = listeningPracticeSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid listening practice payload." }, { status: 400 });
  }

  try {
    const outcome = await persistListeningPracticeOutcome({
      supabase,
      userId: user.id,
      input: payload,
    });

    return NextResponse.json({
      ok: true,
      outcome,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save listening practice progress.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let payload: z.infer<typeof listeningEvaluationSchema>;

  try {
    payload = listeningEvaluationSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid listening evaluation payload." }, { status: 400 });
  }

  const evaluation = evaluateListeningDictationAnswer(payload);
  return NextResponse.json(evaluation);
}
