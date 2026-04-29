import type { AchievementKey } from "@/types/domain";

import { ACHIEVEMENT_KEYS, XP_VALUES } from "@/features/gamification/constants";

export interface LevelSnapshot {
  level: number;
  currentXp: number;
  nextLevelXp: number;
}

export interface AchievementSummary {
  key: AchievementKey;
  earnedAt: string;
}

function getLevelFloor(level: number) {
  return (level - 1) * (level - 1) * 100;
}

function getLevelCeiling(level: number) {
  return level * level * 100;
}

export function calculateLevelFromXp(totalXp: number): LevelSnapshot {
  let level = 1;

  while (totalXp >= getLevelCeiling(level)) {
    level += 1;
  }

  return {
    level,
    currentXp: totalXp - getLevelFloor(level),
    nextLevelXp: getLevelCeiling(level) - getLevelFloor(level),
  };
}

export function getXpForReviewResult(result: "correct" | "incorrect" | "skipped") {
  switch (result) {
    case "correct":
      return XP_VALUES.reviewCorrect;
    case "incorrect":
      return XP_VALUES.reviewIncorrect;
    case "skipped":
      return XP_VALUES.reviewSkipped;
  }
}

export function getXpForReadingResult(result: "completed" | "difficult" | "skipped") {
  switch (result) {
    case "completed":
      return XP_VALUES.readingCompleted;
    case "difficult":
      return XP_VALUES.readingDifficult;
    case "skipped":
      return XP_VALUES.readingSkipped;
  }
}

export function getXpForWritingResult(result: "completed" | "difficult" | "skipped") {
  switch (result) {
    case "completed":
      return XP_VALUES.writingCompleted;
    case "difficult":
      return XP_VALUES.writingDifficult;
    case "skipped":
      return XP_VALUES.readingSkipped;
  }
}

export function isAchievementKey(value: string): value is AchievementKey {
  return (ACHIEVEMENT_KEYS as readonly string[]).includes(value);
}
