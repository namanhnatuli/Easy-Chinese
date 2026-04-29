import { selectReadingPracticeItems, selectWritingPracticeItems, splitWordIntoHanziCharacters } from "@/features/practice/helpers";
import type {
  PracticeDashboardSummary,
  ReadingPracticeSentenceItem,
  ReadingPracticeWordItem,
  RecentPracticeActivityItem,
  WritingPracticeWordDetail,
  WritingPracticeWordListItem,
} from "@/features/practice/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function listWordMemoryByWordIds(userId: string, wordIds: string[]) {
  if (wordIds.length === 0) {
    return new Map<
      string,
      {
        state: "new" | "learning" | "review" | "relearning";
        ease_factor: number;
        interval_days: number;
        due_at: string | null;
        reps: number;
        lapses: number;
        learning_step_index: number;
        last_reviewed_at: string | null;
        last_grade: "again" | "hard" | "good" | "easy" | null;
      }
    >();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_word_memory")
    .select(
      "word_id, state, ease_factor, interval_days, due_at, reps, lapses, learning_step_index, last_reviewed_at, last_grade",
    )
    .eq("user_id", userId)
    .in("word_id", wordIds);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.word_id, row]));
}

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

async function listReadingProgressByWordIds(userId: string, wordIds: string[]) {
  if (wordIds.length === 0) {
    return new Map<string, { id: string; status: "new" | "practicing" | "completed" | "difficult"; attempt_count: number; last_practiced_at: string | null }>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_reading_progress")
    .select("id, word_id, status, attempt_count, last_practiced_at")
    .eq("user_id", userId)
    .eq("practice_type", "word")
    .in("word_id", wordIds);

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).flatMap((row) =>
      row.word_id
        ? [
            [
              row.word_id,
              {
                id: row.id,
                status: row.status,
                attempt_count: row.attempt_count,
                last_practiced_at: row.last_practiced_at,
              },
            ] as const,
          ]
        : [],
    ),
  );
}

async function listReadingProgressByExampleIds(userId: string, exampleIds: string[]) {
  if (exampleIds.length === 0) {
    return new Map<string, { id: string; status: "new" | "practicing" | "completed" | "difficult"; attempt_count: number; last_practiced_at: string | null }>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_reading_progress")
    .select("id, example_id, status, attempt_count, last_practiced_at")
    .eq("user_id", userId)
    .eq("practice_type", "sentence")
    .in("example_id", exampleIds);

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).flatMap((row) =>
      row.example_id
        ? [
            [
              row.example_id,
              {
                id: row.id,
                status: row.status,
                attempt_count: row.attempt_count,
                last_practiced_at: row.last_practiced_at,
              },
            ] as const,
          ]
        : [],
    ),
  );
}

export async function listReadingWordPracticeItems({
  userId,
  limit = 18,
  wordId,
  lessonId,
}: {
  userId?: string | null;
  limit?: number;
  wordId?: string;
  lessonId?: string;
}): Promise<ReadingPracticeWordItem[]> {
  const supabase = await createSupabaseServerClient();
  let query: any = supabase.from("words");

  if (lessonId) {
    query = query
      .select("id, slug, hanzi, simplified, pinyin, vietnamese_meaning, hsk_level, lesson_words!inner(lesson_id)")
      .eq("lesson_words.lesson_id", lessonId);
  } else {
    query = query.select("id, slug, hanzi, simplified, pinyin, vietnamese_meaning, hsk_level");
  }

  if (wordId) {
    query = query.eq("id", wordId);
  }

  const { data, error } = await query
    .eq("is_published", true)
    .order("hsk_level")
    .order("hanzi")
    .limit(Math.max(limit * 3, 24));

  const typedData = data as Array<{
    id: string;
    slug: string;
    hanzi: string;
    simplified: string;
    pinyin: string;
    vietnamese_meaning: string;
    hsk_level: number;
  }> | null;

  if (error) {
    throw error;
  }

  const progressByWordId = userId ? await listReadingProgressByWordIds(userId, (typedData ?? []).map((row) => row.id)) : new Map();
  const memoryByWordId = userId ? await listWordMemoryByWordIds(userId, (typedData ?? []).map((row) => row.id)) : new Map();
  const items = (typedData ?? []).map((row) => {
    const progress = progressByWordId.get(row.id);
    const memory = memoryByWordId.get(row.id);

    return {
      kind: "word",
      id: row.id,
      slug: row.slug,
      hanzi: row.hanzi,
      simplified: row.simplified,
      pinyin: row.pinyin,
      vietnameseMeaning: row.vietnamese_meaning,
      hskLevel: row.hsk_level,
      progress: progress
        ? {
            id: progress.id,
            status: progress.status,
            attemptCount: progress.attempt_count,
            lastPracticedAt: progress.last_practiced_at,
          }
        : null,
      memory: memory
        ? {
            state: memory.state,
            easeFactor: Number(memory.ease_factor),
            intervalDays: memory.interval_days,
            dueAt: memory.due_at,
            reps: memory.reps,
            lapses: memory.lapses,
            learningStepIndex: memory.learning_step_index,
            lastReviewedAt: memory.last_reviewed_at,
            lastGrade: memory.last_grade,
          }
        : null,
    } satisfies ReadingPracticeWordItem;
  });

  return selectReadingPracticeItems(items, limit);
}

export async function listReadingSentencePracticeItems({
  userId,
  limit = 18,
  wordId,
}: {
  userId?: string | null;
  limit?: number;
  wordId?: string;
}): Promise<ReadingPracticeSentenceItem[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("word_examples")
    .select(
      "id, chinese_text, pinyin, vietnamese_meaning, sort_order, words!inner(id, slug, hanzi, pinyin, vietnamese_meaning, hsk_level, is_published)",
    )
    .eq("words.is_published", true)
    .order("sort_order")
    .limit(Math.max(limit * 3, 24));

  if (wordId) {
    query = query.eq("word_id", wordId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const progressByExampleId = userId
    ? await listReadingProgressByExampleIds(userId, (data ?? []).map((row) => row.id))
    : new Map();
  const linkedWordIds = (data ?? [])
    .map((row) => normalizeRelation(row.words)?.id)
    .filter((value): value is string => Boolean(value));
  const memoryByWordId = userId ? await listWordMemoryByWordIds(userId, linkedWordIds) : new Map();

  const items = (data ?? []).map((row) => {
    const word = normalizeRelation(row.words);
    const progress = progressByExampleId.get(row.id);
    const memory = word ? memoryByWordId.get(word.id) : null;

    return {
      kind: "sentence",
      id: row.id,
      chineseText: row.chinese_text,
      pinyin: row.pinyin,
      vietnameseMeaning: row.vietnamese_meaning,
      sortOrder: row.sort_order,
      linkedWord: word
        ? {
            id: word.id,
            slug: word.slug,
            hanzi: word.hanzi,
            pinyin: word.pinyin,
            vietnameseMeaning: word.vietnamese_meaning,
            hskLevel: word.hsk_level,
          }
        : null,
      progress: progress
        ? {
            id: progress.id,
            status: progress.status,
            attemptCount: progress.attempt_count,
            lastPracticedAt: progress.last_practiced_at,
          }
        : null,
      memory: memory
        ? {
            state: memory.state,
            easeFactor: Number(memory.ease_factor),
            intervalDays: memory.interval_days,
            dueAt: memory.due_at,
            reps: memory.reps,
            lapses: memory.lapses,
            learningStepIndex: memory.learning_step_index,
            lastReviewedAt: memory.last_reviewed_at,
            lastGrade: memory.last_grade,
          }
        : null,
    } satisfies ReadingPracticeSentenceItem;
  });

  return selectReadingPracticeItems(items, limit);
}

export async function listWritingPracticeWords({
  userId,
  limit = 24,
  lessonId,
}: {
  userId?: string | null;
  limit?: number;
  lessonId?: string;
}): Promise<WritingPracticeWordListItem[]> {
  const supabase = await createSupabaseServerClient();
  let query: any = supabase.from("words");

  if (lessonId) {
    query = query
      .select("id, slug, hanzi, simplified, pinyin, vietnamese_meaning, hsk_level, lesson_words!inner(lesson_id)")
      .eq("lesson_words.lesson_id", lessonId);
  } else {
    query = query.select("id, slug, hanzi, simplified, pinyin, vietnamese_meaning, hsk_level");
  }

  const { data, error } = await query
    .eq("is_published", true)
    .order("hsk_level")
    .order("hanzi")
    .limit(Math.max(limit * 3, 30));

  const typedData = data as Array<{
    id: string;
    slug: string;
    hanzi: string;
    simplified: string;
    pinyin: string;
    vietnamese_meaning: string;
    hsk_level: number;
  }> | null;

  if (error) {
    throw error;
  }

  const wordIds = (typedData ?? []).map((row) => row.id);
  const progressByWordId = new Map<
    string,
    Array<{ status: "new" | "practicing" | "completed" | "difficult"; attempt_count: number; last_practiced_at: string | null }>
  >();

  if (userId && wordIds.length > 0) {
    const { data: progressRows, error: progressError } = await supabase
      .from("user_writing_progress")
      .select("word_id, status, attempt_count, last_practiced_at")
      .eq("user_id", userId)
      .in("word_id", wordIds);

    if (progressError) {
      throw progressError;
    }

    for (const row of progressRows ?? []) {
      const bucket = progressByWordId.get(row.word_id) ?? [];
      bucket.push(row);
      progressByWordId.set(row.word_id, bucket);
    }
  }

  const items = (typedData ?? [])
    .map((row) => {
      const characters = splitWordIntoHanziCharacters(row.hanzi || row.simplified);
      if (characters.length === 0) {
        return null;
      }

      const progressRows = progressByWordId.get(row.id) ?? [];
      const lastPracticedAt =
        progressRows
          .map((entry) => entry.last_practiced_at)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? null;

      return {
        id: row.id,
        slug: row.slug,
        hanzi: row.hanzi,
        pinyin: row.pinyin,
        vietnameseMeaning: row.vietnamese_meaning,
        hskLevel: row.hsk_level,
        characterCount: characters.length,
        difficultCharacters: progressRows.filter((entry) => entry.status === "difficult").length,
        completedCharacters: progressRows.filter((entry) => entry.status === "completed").length,
        totalAttempts: progressRows.reduce((sum, entry) => sum + entry.attempt_count, 0),
        lastPracticedAt,
      } satisfies WritingPracticeWordListItem;
    })
    .filter((item): item is WritingPracticeWordListItem => item !== null);

  return selectWritingPracticeItems(items, limit);
}

export async function getWritingPracticeWordDetail({
  wordId,
  userId,
}: {
  wordId: string;
  userId?: string | null;
}): Promise<WritingPracticeWordDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: word, error } = await supabase
    .from("words")
    .select("id, slug, hanzi, simplified, pinyin, vietnamese_meaning, hsk_level")
    .eq("id", wordId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!word) {
    return null;
  }

  const characters = splitWordIntoHanziCharacters(word.hanzi || word.simplified);
  if (characters.length === 0) {
    return null;
  }

  const progressByCharacter = new Map<string, { status: "new" | "practicing" | "completed" | "difficult"; attempt_count: number; last_practiced_at: string | null }>();
  let memory:
    | {
        state: "new" | "learning" | "review" | "relearning";
        ease_factor: number;
        interval_days: number;
        due_at: string | null;
        reps: number;
        lapses: number;
        learning_step_index: number;
        last_reviewed_at: string | null;
        last_grade: "again" | "hard" | "good" | "easy" | null;
      }
    | null = null;

  if (userId) {
    const memoryByWordId = await listWordMemoryByWordIds(userId, [wordId]);
    memory = memoryByWordId.get(wordId) ?? null;
    const { data: progressRows, error: progressError } = await supabase
      .from("user_writing_progress")
      .select("character, status, attempt_count, last_practiced_at")
      .eq("user_id", userId)
      .eq("word_id", wordId);

    if (progressError) {
      throw progressError;
    }

    for (const row of progressRows ?? []) {
      progressByCharacter.set(row.character, row);
    }
  }

  return {
    id: word.id,
    slug: word.slug,
    hanzi: word.hanzi,
    simplified: word.simplified,
    pinyin: word.pinyin,
    vietnameseMeaning: word.vietnamese_meaning,
    hskLevel: word.hsk_level,
    memory: memory
      ? {
          state: memory.state,
          easeFactor: Number(memory.ease_factor),
          intervalDays: memory.interval_days,
          dueAt: memory.due_at,
          reps: memory.reps,
          lapses: memory.lapses,
          learningStepIndex: memory.learning_step_index,
          lastReviewedAt: memory.last_reviewed_at,
          lastGrade: memory.last_grade,
        }
      : null,
    characters: characters.map((character) => {
      const progress = progressByCharacter.get(character);

      return {
        character,
        status: progress?.status ?? "new",
        attemptCount: progress?.attempt_count ?? 0,
        lastPracticedAt: progress?.last_practiced_at ?? null,
      };
    }),
  };
}

export async function getPracticeDashboardSummary(userId: string): Promise<PracticeDashboardSummary> {
  const supabase = await createSupabaseServerClient();
  const [{ data: readingRows, error: readingError }, { data: writingRows, error: writingError }] =
    await Promise.all([
      supabase.from("user_reading_progress").select("status").eq("user_id", userId),
      supabase.from("user_writing_progress").select("status").eq("user_id", userId),
    ]);

  if (readingError) {
    throw readingError;
  }

  if (writingError) {
    throw writingError;
  }

  return {
    readingCompletedCount: (readingRows ?? []).filter((row) => row.status === "completed").length,
    difficultReadingCount: (readingRows ?? []).filter((row) => row.status === "difficult").length,
    writingCharactersPracticed: (writingRows ?? []).length,
    difficultWritingCount: (writingRows ?? []).filter((row) => row.status === "difficult").length,
  };
}

export async function listRecentPracticeActivity(
  userId: string,
  limit = 8,
): Promise<RecentPracticeActivityItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("practice_events")
    .select(
      "id, created_at, practice_type, result, words(id, slug, hanzi, pinyin, vietnamese_meaning), word_examples(id, chinese_text, vietnamese_meaning)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const word = normalizeRelation(row.words);
    const sentence = normalizeRelation(row.word_examples);

    return {
      id: row.id,
      createdAt: row.created_at,
      practiceType: row.practice_type,
      result: row.result,
      word: word
        ? {
            id: word.id,
            slug: word.slug,
            hanzi: word.hanzi,
            pinyin: word.pinyin,
            vietnameseMeaning: word.vietnamese_meaning,
          }
        : null,
      sentence: sentence
        ? {
            id: sentence.id,
            chineseText: sentence.chinese_text,
            vietnameseMeaning: sentence.vietnamese_meaning,
          }
        : null,
    };
  });
}
