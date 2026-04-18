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
}: {
  existingProgress: unknown;
  lessonMembership?: unknown;
}) {
  const operations = {
    reviewEvents: [] as Array<Record<string, unknown>>,
    wordProgress: [] as Array<Record<string, unknown>>,
    lessonProgress: [] as Array<Record<string, unknown>>,
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
          insert: async (payload: Record<string, unknown>) => {
            operations.reviewEvents.push(payload);
            return { error: null };
          },
        };
      }

      if (table === "user_lesson_progress") {
        return {
          upsert: async (payload: Record<string, unknown>) => {
            operations.lessonProgress.push(payload);
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
  assert.equal(operations.reviewEvents[0].user_id, "user-1");
  assert.equal(operations.wordProgress[0].status, "review");
  assert.equal(operations.wordProgress[0].interval_days, 14);
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
});
