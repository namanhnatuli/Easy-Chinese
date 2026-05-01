import type { PracticeProgressStatus } from "@/types/domain";

import type {
  ListeningDifficulty,
  ListeningDifficultyFilter,
  ListeningPracticeItem,
  ListeningProgressSnapshot,
  ListeningSourceMetadata,
  ListeningSourceType,
  ListeningSourceTypeFilter,
} from "@/features/listening/types";

const hanziPattern = /\p{Script=Han}/u;

function getLastPracticedTime(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

function getCreatedTime(value: string) {
  return new Date(value).getTime();
}

function getStatusRank(status: PracticeProgressStatus | null | undefined) {
  if (!status || status === "new") {
    return 0;
  }

  switch (status) {
    case "difficult":
      return 1;
    case "practicing":
      return 2;
    case "completed":
      return 3;
  }
}

export function isValidListeningText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && hanziPattern.test(trimmed);
}

export function resolveListeningSourceText(sourceText: string | null | undefined, textPreview: string) {
  return (sourceText?.trim() || textPreview.trim());
}

export function normalizeListeningSourceType(value: string | null | undefined): ListeningSourceType {
  if (value === "word" || value === "example" || value === "article" || value === "custom") {
    return value;
  }

  return "custom";
}

export function parseListeningSourceMetadata(value: unknown): ListeningSourceMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as ListeningSourceMetadata;
}

export function getListeningDifficulty(characterCount: number): ListeningDifficulty {
  if (characterCount <= 8) {
    return "easy";
  }

  if (characterCount <= 20) {
    return "medium";
  }

  if (characterCount <= 50) {
    return "hard";
  }

  return "very-hard";
}

export function matchesListeningDifficulty(
  characterCount: number,
  filter: ListeningDifficultyFilter,
) {
  const difficulty = getListeningDifficulty(characterCount);
  if (filter === "all") {
    return true;
  }

  if (filter === "hard") {
    return difficulty === "hard" || difficulty === "very-hard";
  }

  return difficulty === filter;
}

export function matchesListeningSourceType(
  sourceType: ListeningSourceType,
  filter: ListeningSourceTypeFilter,
) {
  return filter === "all" || sourceType === filter;
}

export function deriveListeningProgressStatus({
  existing,
  result,
}: {
  existing: ListeningProgressSnapshot | null;
  result: "correct" | "almost" | "incorrect" | "skipped";
}): PracticeProgressStatus {
  if (result === "correct") {
    return "completed";
  }

  if (result === "almost") {
    return "practicing";
  }

  if (result === "incorrect") {
    return "difficult";
  }

  return existing?.status ?? "practicing";
}

export function selectListeningPracticeItems(items: ListeningPracticeItem[], limit: number) {
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

      const leftDifficulty = left.characterCount;
      const rightDifficulty = right.characterCount;
      if (leftDifficulty !== rightDifficulty) {
        return leftDifficulty - rightDifficulty;
      }

      return getCreatedTime(right.createdAt) - getCreatedTime(left.createdAt);
    })
    .slice(0, limit);
}
