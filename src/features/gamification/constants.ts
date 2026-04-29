import type { AchievementKey } from "@/types/domain";

export const XP_VALUES = {
  reviewCorrect: 12,
  reviewIncorrect: 5,
  reviewSkipped: 3,
  readingCompleted: 6,
  readingDifficult: 4,
  readingSkipped: 2,
  writingCompleted: 8,
  writingDifficult: 5,
  lessonCompletedBonus: 40,
  achievementUnlockedBonus: 25,
} as const;

export const ACHIEVEMENT_KEYS = [
  "first_lesson_completed",
  "seven_day_streak",
  "fifty_words_learned",
  "hundred_characters_written",
] as const satisfies readonly AchievementKey[];
