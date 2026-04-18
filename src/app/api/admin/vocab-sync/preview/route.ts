import { NextRequest, NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { startVocabSyncPreview, vocabSyncPreviewRequestSchema } from "@/features/vocabulary-sync/preview";

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();

  if (!auth.user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  if (auth.role !== "admin") {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  try {
    const payload = vocabSyncPreviewRequestSchema.parse(await request.json());
    const result = await startVocabSyncPreview(payload);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("vocab_sync_preview_request_failed", error, {
      userId: auth.user.id,
    });

    const message = error instanceof Error ? error.message : "Preview sync failed.";
    const status = message.toLowerCase().includes("required") || message.toLowerCase().includes("invalid")
      ? 400
      : 500;

    return NextResponse.json({ message }, { status });
  }
}
