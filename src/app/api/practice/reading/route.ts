import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { persistReadingPracticeOutcome } from "@/features/practice/persistence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const readingPracticeSchema = z
  .object({
    practiceType: z.enum(["word", "sentence"]),
    wordId: z.string().uuid().optional(),
    senseId: z.string().uuid().nullable().optional(),
    exampleId: z.string().uuid().optional(),
    grade: z.enum(["again", "hard", "good", "easy"]),
  })
  .superRefine((value, ctx) => {
    if (value.practiceType === "word" && !value.wordId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "wordId is required for word practice.",
        path: ["wordId"],
      });
    }

    if (value.practiceType === "sentence" && !value.exampleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "exampleId is required for sentence practice.",
        path: ["exampleId"],
      });
    }
  });

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  let payload: z.infer<typeof readingPracticeSchema>;

  try {
    payload = readingPracticeSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid reading practice payload." }, { status: 400 });
  }

  try {
    await persistReadingPracticeOutcome({
      supabase,
      userId: user.id,
      input: payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save reading practice progress.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
