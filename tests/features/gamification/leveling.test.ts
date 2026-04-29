import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateLevelFromXp,
  getXpForReadingResult,
  getXpForReviewResult,
  getXpForWritingResult,
} from "@/features/gamification/leveling";

test("calculateLevelFromXp uses quadratic thresholds", () => {
  assert.deepEqual(calculateLevelFromXp(0), {
    level: 1,
    currentXp: 0,
    nextLevelXp: 100,
  });

  assert.deepEqual(calculateLevelFromXp(100), {
    level: 2,
    currentXp: 0,
    nextLevelXp: 300,
  });

  assert.deepEqual(calculateLevelFromXp(450), {
    level: 3,
    currentXp: 50,
    nextLevelXp: 500,
  });
});

test("xp helpers return deterministic rewards", () => {
  assert.equal(getXpForReviewResult("correct"), 12);
  assert.equal(getXpForReadingResult("difficult"), 4);
  assert.equal(getXpForWritingResult("completed"), 8);
});
