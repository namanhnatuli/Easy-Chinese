import { NextRequest, NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth";
import { getRecentVocabSyncPreviewBatches } from "@/features/vocabulary-sync/preview";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();

  if (!auth.user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  if (auth.role !== "admin") {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 20;
  const batches = await getRecentVocabSyncPreviewBatches(Number.isFinite(limit) ? limit : 20);

  return NextResponse.json({ batches });
}
