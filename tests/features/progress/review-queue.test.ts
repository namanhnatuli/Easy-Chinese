import assert from "node:assert/strict";
import test from "node:test";

import { filterDueReviewRows, isDueReviewAt } from "@/features/progress/review-queue";

test("due review helper returns only due items sorted by next review time", () => {
  const now = new Date("2026-04-18T10:00:00.000Z");
  const rows = [
    { id: "b", next_review_at: "2026-04-18T09:00:00.000Z" },
    { id: "c", next_review_at: "2026-04-18T12:00:00.000Z" },
    { id: "a", next_review_at: "2026-04-17T08:00:00.000Z" },
  ];

  assert.equal(isDueReviewAt(rows[0].next_review_at, now), true);
  assert.deepEqual(
    filterDueReviewRows(rows, now).map((row) => row.id),
    ["a", "b"],
  );
});
