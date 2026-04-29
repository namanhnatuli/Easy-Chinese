import assert from "node:assert/strict";
import test from "node:test";

import { persistStudyOutcome } from "@/features/learning/persistence";

function createQueryBuilder({
  maybeSingleResult,
  insertError = null,
  upsertError = null,
}: {
  maybeSingleResult?: { data: unknown; error: unknown };
  insertError?: unknown;
  upsertError?: unknown;
}) {
  return {
    eq() {
      return this;
    },
    select() {
      return this;
    },
    maybeSingle: async () => maybeSingleResult ?? { data: null, error: null },
    insert: async () => ({ error: insertError }),
    upsert: async () => ({ error: upsertError }),
  };
}

function createSupabaseStub({
  existingProgress,
  lessonMembership,
  existingMemory = null,
}: {
  existingProgress: unknown;
  lessonMembership?: unknown;
  existingMemory?: unknown;
}) {
  const operations = {
    reviewEvents: [] as Array<Record<string, unknown>>,
    wordProgress: [] as Array<Record<string, unknown>>,
    lessonProgress: [] as Array<Record<string, unknown>>,
    wordMemory: [] as Array<Record<string, unknown>>,
    learningStats: [] as Array<Record<string, unknown>>,
    xp: [] as Array<Record<string, unknown>>,
    levels: [] as Array<Record<string, unknown>>,
    achievements: [] as Array<Record<string, unknown>>,
    xpEvents: [] as Array<Record<string, unknown>>,
  };

  const supabase = {
    from(table: string) {
      if (table === "user_word_progress") {
        const readBuilder = createQueryBuilder({
          maybeSingleResult: { data: existingProgress, error: null },
        });

        return {
          ...readBuilder,
          upsert: async (payload: Record<string, unknown>) => {
            operations.wordProgress.push(payload);
            return { error: null };
          },
        };
      }

      if (table === "lesson_words") {
        return createQueryBuilder({
          maybeSingleResult: { data: lessonMembership ?? null, error: null },
        });
      }

      if (table === "review_events") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          in() {
            return this;
          },
          gte() {
            return this;
          },
          lt() {
            return Promise.resolve({ count: 0, error: null });
          },
          insert: async (payload: Record<string, unknown>) => {
            operations.reviewEvents.push(payload);
            return { error: null };
          },
        };
      }

      if (table === "practice_events") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          gte() {
            return this;
          },
          lt() {
            return Promise.resolve({ count: 0, error: null });
          },
        };
      }

      if (table === "user_word_memory") {
        return {
          select(_columns?: string, options?: { count?: string; head?: boolean }) {
            if (options?.head) {
              return {
                eq() {
                  return this;
                },
                gt() {
                  return Promise.resolve({ count: 0, error: null });
                },
              };
            }

            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: existingMemory, error: null }),
          upsert: async (payload: Record<string, unknown>) => {
            operations.wordMemory.push(payload);
            return { error: null };
          },
        };
      }

      if (table === "user_learning_stats") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: null, error: null }),
          upsert: async (payload: Record<string, unknown>) => {
            operations.learningStats.push(payload);
            return { error: null };
          },
        };
      }

      if (table === "user_lesson_progress") {
        return {
          select(_columns?: string, options?: { count?: string; head?: boolean }) {
            if (options?.head) {
              return {
                eq() {
                  return this;
                },
                gte() {
                  return Promise.resolve({ count: 0, error: null });
                },
              };
            }

            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: null, error: null }),
          upsert: async (payload: Record<string, unknown>) => {
            operations.lessonProgress.push(payload);
            return { error: null };
          },
        };
      }

      if (table === "user_writing_progress") {
        return {
          select(_columns?: string, options?: { count?: string; head?: boolean }) {
            if (options?.head) {
              let eqCount = 0;
              return {
                eq() {
                  eqCount += 1;
                  return eqCount >= 2 ? Promise.resolve({ count: 0, error: null }) : this;
                },
              };
            }

            return this;
          },
        };
      }

      if (table === "user_xp") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: null, error: null }),
          upsert: async (payload: Record<string, unknown>) => {
            operations.xp.push(payload);
            return { error: null };
          },
        };
      }

      if (table === "user_level") {
        return {
          upsert: async (payload: Record<string, unknown>) => {
            operations.levels.push(payload);
            return { error: null };
          },
        };
      }

      if (table === "user_xp_events") {
        return {
          select() {
            return this;
          },
          eq() {
            return Promise.resolve({ data: operations.xpEvents.map((row) => ({ amount: row.amount })), error: null });
          },
          insert: async (payload: Record<string, unknown>) => {
            operations.xpEvents.push(payload);
            return { error: null };
          },
        };
      }

      if (table === "user_achievements") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: null, error: null }),
          insert: async (payload: Record<string, unknown>) => {
            operations.achievements.push(payload);
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { supabase, operations };
}

test("persistStudyOutcome writes review event, word progress, and lesson progress for valid lesson study", async () => {
  const { supabase, operations } = createSupabaseStub({
    existingProgress: {
      status: "review",
      correct_count: 2,
      incorrect_count: 1,
      streak_count: 2,
      interval_days: 7,
      ease_factor: 2.5,
    },
    lessonMembership: { word_id: "word-1" },
  });

  await persistStudyOutcome({
    supabase: supabase as never,
    userId: "user-1",
    input: {
      wordId: "word-1",
      lessonId: "lesson-1",
      mode: "flashcard",
      result: "correct",
      completionPercent: 100,
    },
  });

  assert.equal(operations.reviewEvents.length, 1);
  assert.equal(operations.wordProgress.length, 1);
  assert.equal(operations.lessonProgress.length, 1);
  assert.equal(operations.wordMemory.length, 1);
  assert.equal(operations.learningStats.length, 1);
  assert.equal(operations.xp.length >= 1, true);
  assert.equal(operations.levels.length >= 1, true);
  assert.equal(operations.reviewEvents[0].user_id, "user-1");
  assert.equal(operations.wordProgress[0].status, "learning");
  assert.equal(operations.wordProgress[0].interval_days, 7);
  assert.equal(operations.wordProgress[0].next_review_at, null);
  assert.equal(operations.wordMemory[0].word_id, "word-1");
  assert.equal(operations.lessonProgress[0].completion_percent, 100);
  assert.ok(typeof operations.lessonProgress[0].completed_at === "string");
});

test("persistStudyOutcome rejects lesson submissions when the word is not in that lesson", async () => {
  const { supabase, operations } = createSupabaseStub({
    existingProgress: null,
    lessonMembership: null,
  });

  await assert.rejects(
    persistStudyOutcome({
      supabase: supabase as never,
      userId: "user-1",
      input: {
        wordId: "word-2",
        lessonId: "lesson-1",
        mode: "typing",
        result: "incorrect",
        completionPercent: 25,
      },
    }),
    /does not belong to this lesson/,
  );

  assert.equal(operations.reviewEvents.length, 0);
  assert.equal(operations.wordProgress.length, 0);
  assert.equal(operations.lessonProgress.length, 0);
  assert.equal(operations.wordMemory.length, 0);
  assert.equal(operations.learningStats.length, 0);
});

test("persistStudyOutcome accepts queue reviews based on due memory rows", async () => {
  const { supabase, operations } = createSupabaseStub({
    existingProgress: null,
    existingMemory: {
      due_at: "2026-04-18T00:00:00.000Z",
      state: "review",
      ease_factor: 2.5,
      interval_days: 7,
      reps: 3,
      lapses: 0,
      learning_step_index: 0,
      last_reviewed_at: "2026-04-17T00:00:00.000Z",
      last_grade: "good",
    },
  });

  await persistStudyOutcome({
    supabase: supabase as never,
    userId: "user-1",
    input: {
      wordId: "word-1",
      mode: "flashcard",
      result: "correct",
      completionPercent: 100,
    },
  });

  assert.equal(operations.wordMemory.length, 1);
  assert.equal(operations.wordProgress.length, 1);
  assert.equal(operations.reviewEvents.length, 1);
});
