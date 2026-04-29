import type { PracticeEventResult, PracticeProgressStatus } from "@/types/domain";

import type {
  ReadingPracticeItem,
  ReadingProgressSnapshot,
  WritingPracticeWordListItem,
} from "@/features/practice/types";

const hanziCharacterPattern = /\p{Script=Han}/u;

function getStatusRank(status: PracticeProgressStatus | null | undefined) {
  if (!status) {
    return 2;
  }

  switch (status) {
    case "difficult":
      return 0;
    case "practicing":
      return 1;
    case "new":
      return 2;
    case "completed":
      return 3;
  }
}

function getLastPracticedTime(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

export function splitWordIntoHanziCharacters(value: string) {
  return Array.from(value).filter((character) => hanziCharacterPattern.test(character));
}

export function derivePracticeStatus(
  existingStatus: PracticeProgressStatus | null | undefined,
  result: PracticeEventResult,
) {
  if (result === "completed") {
    return "completed" satisfies PracticeProgressStatus;
  }

  if (result === "difficult") {
    return "difficult" satisfies PracticeProgressStatus;
  }

  if (existingStatus === "completed" || existingStatus === "difficult") {
    return existingStatus;
  }

  return "practicing" satisfies PracticeProgressStatus;
}

export function buildPracticeProgressPatch(
  existing: ReadingProgressSnapshot | null,
  result: PracticeEventResult,
  now: Date,
) {
  return {
    status: derivePracticeStatus(existing?.status, result),
    attempt_count: (existing?.attemptCount ?? 0) + 1,
    last_practiced_at: now.toISOString(),
  };
}

export function selectReadingPracticeItems<T extends ReadingPracticeItem>(items: T[], limit: number) {
  return [...items]
    .sort((left, right) => {
      const statusDelta = getStatusRank(left.progress?.status) - getStatusRank(right.progress?.status);
      if (statusDelta !== 0) {
        return statusDelta;
      }

      const leftTime = getLastPracticedTime(left.progress?.lastPracticedAt);
      const rightTime = getLastPracticedTime(right.progress?.lastPracticedAt);
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      if (left.kind === "word" && right.kind === "word") {
        return left.hskLevel - right.hskLevel || left.hanzi.localeCompare(right.hanzi, "zh-Hans-CN");
      }

      if (left.kind === "sentence" && right.kind === "sentence") {
        const leftLevel = left.linkedWord?.hskLevel ?? Number.MAX_SAFE_INTEGER;
        const rightLevel = right.linkedWord?.hskLevel ?? Number.MAX_SAFE_INTEGER;
        return leftLevel - rightLevel || left.sortOrder - right.sortOrder;
      }

      return 0;
    })
    .slice(0, limit);
}

export function selectWritingPracticeItems(items: WritingPracticeWordListItem[], limit: number) {
  return [...items]
    .sort((left, right) => {
      const difficultDelta = right.difficultCharacters - left.difficultCharacters;
      if (difficultDelta !== 0) {
        return difficultDelta;
      }

      const completedRatioLeft = left.characterCount === 0 ? 0 : left.completedCharacters / left.characterCount;
      const completedRatioRight = right.characterCount === 0 ? 0 : right.completedCharacters / right.characterCount;
      if (completedRatioLeft !== completedRatioRight) {
        return completedRatioLeft - completedRatioRight;
      }

      const timeDelta = getLastPracticedTime(left.lastPracticedAt) - getLastPracticedTime(right.lastPracticedAt);
      if (timeDelta !== 0) {
        return timeDelta;
      }

      return left.hskLevel - right.hskLevel || left.hanzi.localeCompare(right.hanzi, "zh-Hans-CN");
    })
    .slice(0, limit);
}
