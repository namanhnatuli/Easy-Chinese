import { NextResponse } from "next/server";

import { recordArticleRead } from "@/features/articles/progress";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> },
) {
  const { articleId } = await params;
  const result = await recordArticleRead(articleId);

  return NextResponse.json(result);
}
