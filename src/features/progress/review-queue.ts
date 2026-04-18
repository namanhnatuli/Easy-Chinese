export interface DueReviewCandidate {
  next_review_at: string | null;
}

export function isDueReviewAt(nextReviewAt: string | null, now: Date) {
  if (!nextReviewAt) {
    return false;
  }

  return new Date(nextReviewAt) <= now;
}

export function filterDueReviewRows<T extends DueReviewCandidate>(rows: T[], now: Date) {
  return rows
    .filter((row) => isDueReviewAt(row.next_review_at, now))
    .sort((left, right) => {
      const leftTime = new Date(left.next_review_at ?? 0).getTime();
      const rightTime = new Date(right.next_review_at ?? 0).getTime();
      return leftTime - rightTime;
    });
}
