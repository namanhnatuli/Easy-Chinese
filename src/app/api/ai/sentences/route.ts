import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getWordAiContext } from "@/features/ai/context";
import { generateExampleSentences } from "@/features/ai/service";

const sentenceSchema = z.object({
  wordId: z.string().uuid(),
  count: z.coerce.number().int().min(2).max(3).optional(),
});

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof sentenceSchema>;

  try {
    payload = sentenceSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid AI sentence payload." }, { status: 400 });
  }

  try {
    const context = await getWordAiContext(payload.wordId);
    if (!context) {
      return NextResponse.json({ message: "Word not found." }, { status: 404 });
    }

    const sentences = await generateExampleSentences(context, payload.count ?? 3);
    return NextResponse.json({ sentences });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate sentences.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
