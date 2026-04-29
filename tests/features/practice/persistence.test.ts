import assert from "node:assert/strict";
import test from "node:test";

import { persistReadingPracticeOutcome, persistWritingPracticeOutcome } from "@/features/practice/persistence";

function createSupabaseStub() {
  const operations = {
    practiceEvents: [] as Array<Record<string, unknown>>,
    readingUpdates: [] as Array<Record<string, unknown>>,
    readingInserts: [] as Array<Record<string, unknown>>,
    writingUpdates: [] as Array<Record<string, unknown>>,
    writingInserts: [] as Array<Record<string, unknown>>,
    wordMemory: [] as Array<Record<string, unknown>>,
    learningStats: [] as Array<Record<string, unknown>>,
    xp: [] as Array<Record<string, unknown>>,
    levels: [] as Array<Record<string, unknown>>,
    achievements: [] as Array<Record<string, unknown>>,
    xpEvents: [] as Array<Record<string, unknown>>,
  };

  const supabase = {
    from(table: string) {
      if (table === "words") {
        const builder: {
          id?: string;
          is_published?: boolean;
          select: () => typeof builder;
          eq: (column: string, value: string | boolean) => typeof builder;
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
        } = {
          select() {
            return this;
          },
          eq(column: string, value: string | boolean) {
            if (column === "id") {
              this.id = value as string;
            }

            if (column === "is_published") {
              this.is_published = value as boolean;
            }

            return this;
          },
          async maybeSingle() {
            if (this.id === "missing-word") {
              return { data: null, error: null };
            }

            return {
              data: {
                id: this.id ?? "word-1",
                hanzi: "学习",
                simplified: "学习",
                is_published: true,
              },
              error: null,
            };
          },
        };

        return builder;
      }

      if (table === "word_examples") {
        const builder: {
          id?: string;
          select: () => typeof builder;
          eq: (column: string, value: string | boolean) => typeof builder;
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
        } = {
          select() {
            return this;
          },
          eq(column: string, value: string | boolean) {
            if (column === "id") {
              this.id = value as string;
            }

            return this;
          },
          async maybeSingle() {
            if (this.id === "missing-example") {
              return { data: null, error: null };
            }

            return {
              data: {
                id: this.id ?? "example-1",
                word_id: "word-1",
                words: {
                  id: "word-1",
                  is_published: true,
                },
              },
              error: null,
            };
          },
        };

        return builder;
      }

      if (table === "user_reading_progress") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: null, error: null }),
          insert: async (payload: Record<string, unknown>) => {
            operations.readingInserts.push(payload);
            return { error: null };
          },
          update(payload: Record<string, unknown>) {
            operations.readingUpdates.push(payload);
            return {
              eq() {
                return this;
              },
            };
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
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: null, error: null }),
          insert: async (payload: Record<string, unknown>) => {
            operations.writingInserts.push(payload);
            return { error: null };
          },
          update(payload: Record<string, unknown>) {
            operations.writingUpdates.push(payload);
            return {
              eq() {
                return this;
              },
            };
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
          insert: async (payload: Record<string, unknown>) => {
            operations.practiceEvents.push(payload);
            return { error: null };
          },
        };
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
            return { error: null };
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
          maybeSingle: async () => ({ data: null, error: null }),
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

test("persistReadingPracticeOutcome inserts sentence reading progress and event", async () => {
  const { supabase, operations } = createSupabaseStub();

  await persistReadingPracticeOutcome({
    supabase: supabase as never,
    userId: "user-1",
    input: {
      practiceType: "sentence",
      exampleId: "example-1",
      grade: "good",
    },
  });

  assert.equal(operations.practiceEvents.length, 1);
  assert.equal(operations.readingInserts.length, 1);
  assert.equal(operations.wordMemory.length, 1);
  assert.equal(operations.learningStats.length, 1);
  assert.equal(operations.xp.length >= 1, true);
  assert.equal(operations.levels.length >= 1, true);
  assert.equal(operations.readingInserts[0].practice_type, "sentence");
  assert.equal(operations.readingInserts[0].status, "completed");
  assert.equal(operations.readingInserts[0].example_id, "example-1");
});

test("persistWritingPracticeOutcome inserts character writing progress and event", async () => {
  const { supabase, operations } = createSupabaseStub();

  await persistWritingPracticeOutcome({
    supabase: supabase as never,
    userId: "user-1",
    input: {
      wordId: "word-1",
      character: "学",
      grade: "hard",
    },
  });

  assert.equal(operations.practiceEvents.length, 1);
  assert.equal(operations.writingInserts.length, 1);
  assert.equal(operations.wordMemory.length, 1);
  assert.equal(operations.learningStats.length, 1);
  assert.equal(operations.xp.length >= 1, true);
  assert.equal(operations.levels.length >= 1, true);
  assert.equal(operations.writingInserts[0].character, "学");
  assert.equal(operations.writingInserts[0].status, "difficult");
});
