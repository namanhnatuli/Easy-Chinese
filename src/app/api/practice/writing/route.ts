import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { persistWritingPracticeOutcome } from "@/features/practice/persistence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const writingPracticeSchema = z.object({
  wordId: z.string().uuid(),
  character: z.string().trim().min(1).max(2),
  grade: z.enum(["again", "hard", "good", "easy"]),
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  let payload: z.infer<typeof writingPracticeSchema>;

  try {
    payload = writingPracticeSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid writing practice payload." }, { status: 400 });
  }

  try {
    await persistWritingPracticeOutcome({
      supabase,
      userId: user.id,
      input: payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save writing practice progress.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
