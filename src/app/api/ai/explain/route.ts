import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getArticleAiContext,
  getGrammarAiContext,
  getWordAiContext,
} from "@/features/ai/context";
import {
  generateArticleExplanation,
  generateGrammarExplanation,
  generateWordExplanation,
} from "@/features/ai/service";

const explainSchema = z
  .object({
    kind: z.enum(["word", "grammar", "article"]),
    wordId: z.string().uuid().optional(),
    grammarId: z.string().uuid().optional(),
    articleId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "word" && !value.wordId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["wordId"], message: "wordId is required." });
    }

    if (value.kind === "grammar" && !value.grammarId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["grammarId"], message: "grammarId is required." });
    }

    if (value.kind === "article" && !value.articleId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["articleId"], message: "articleId is required." });
    }
  });

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof explainSchema>;

  try {
    payload = explainSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid AI explanation payload." }, { status: 400 });
  }

  try {
    if (payload.kind === "word") {
      const context = await getWordAiContext(payload.wordId!);
      if (!context) {
        return NextResponse.json({ message: "Word not found." }, { status: 404 });
      }

      return NextResponse.json(await generateWordExplanation(context));
    }

    if (payload.kind === "grammar") {
      const context = await getGrammarAiContext(payload.grammarId!);
      if (!context) {
        return NextResponse.json({ message: "Grammar point not found." }, { status: 404 });
      }

      return NextResponse.json(await generateGrammarExplanation(context));
    }

    const context = await getArticleAiContext(payload.articleId!);
    if (!context) {
      return NextResponse.json({ message: "Article not found." }, { status: 404 });
    }

    return NextResponse.json(await generateArticleExplanation(context));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate explanation.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
