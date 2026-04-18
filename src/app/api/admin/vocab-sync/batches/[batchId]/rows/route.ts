import { NextRequest, NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth";
import { getVocabSyncPreviewRows } from "@/features/vocabulary-sync/preview";

export async function GET(request: NextRequest, context: { params: Promise<{ batchId: string }> }) {
  const auth = await getAuthContext();

  if (!auth.user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  if (auth.role !== "admin") {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { batchId } = await context.params;
  const changeType = request.nextUrl.searchParams.get("changeType");
  const reviewStatus = request.nextUrl.searchParams.get("reviewStatus");
  const applyStatus = request.nextUrl.searchParams.get("applyStatus");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const rows = await getVocabSyncPreviewRows(batchId, {
    changeType: changeType as "new" | "changed" | "unchanged" | "conflict" | "invalid" | undefined,
    reviewStatus: reviewStatus as
      | "pending"
      | "needs_review"
      | "approved"
      | "rejected"
      | "applied"
      | undefined,
    applyStatus: applyStatus as "pending" | "applied" | "failed" | "skipped" | undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json({ rows });
}
