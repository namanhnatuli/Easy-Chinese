import { NextRequest, NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth";
import { getVocabSyncPreviewBatch } from "@/features/vocabulary-sync/preview";

export async function GET(_: NextRequest, context: { params: Promise<{ batchId: string }> }) {
  const auth = await getAuthContext();

  if (!auth.user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  if (auth.role !== "admin") {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { batchId } = await context.params;
  const batch = await getVocabSyncPreviewBatch(batchId);

  if (!batch) {
    return NextResponse.json({ message: "Batch not found." }, { status: 404 });
  }

  return NextResponse.json({ batch });
}
