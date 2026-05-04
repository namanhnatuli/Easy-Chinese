import { selectReadingPracticeItems, selectWritingPracticeItems, splitWordIntoHanziCharacters } from "@/features/practice/helpers";
import { DEFAULT_LEARNING_SCHEDULER_SETTINGS } from "@/features/memory/spaced-repetition";
import { buildLearningSenseCards } from "@/features/learning/sense-cards";
import type {
  PracticeDashboardSummary,
  ReadingPracticeSentenceItem,
  ReadingPracticeWordItem,
  RecentPracticeActivityItem,
  WritingPracticeWordDetail,
  WritingPracticeWordListItem,
} from "@/features/practice/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type WordMemoryRow = {
  id: string;
  word_id: string;
  sense_id: string | null;
  scheduler_type: "sm2" | "fsrs";
  state: "new" | "learning" | "review" | "relearning";
  ease_factor: number;
  interval_days: number;
  due_at: string | null;
  reps: number;
  lapses: number;
  learning_step_index: number;
  fsrs_stability: number | null;
  fsrs_difficulty: number | null;
  fsrs_retrievability: number | null;
  scheduled_days: number;
  elapsed_days: number;
  last_reviewed_at: string | null;
  last_grade: "again" | "hard" | "good" | "easy" | null;
};

async function listWordMemoryByWordIds(userId: string, wordIds: string[]): Promise<WordMemoryRow[]> {
  if (wordIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_word_memory")
    .select(
      "id, word_id, sense_id, scheduler_type, state, ease_factor, interval_days, due_at, reps, lapses, learning_step_index, fsrs_stability, fsrs_difficulty, fsrs_retrievability, scheduled_days, elapsed_days, last_reviewed_at, last_grade",
    )
    .eq("user_id", userId)
    .in("word_id", wordIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

async function listReadingProgressByWordIds(userId: string, wordIds: string[]) {
  if (wordIds.length === 0) {
    return [] as Array<{ id: string; word_id: string | null; sense_id: string | null; status: "new" | "practicing" | "completed" | "difficult"; attempt_count: number; last_practiced_at: string | null }>;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_reading_progress")
    .select("id, word_id, sense_id, status, attempt_count, last_practiced_at")
    .eq("user_id", userId)
    .eq("practice_type", "word")
    .in("word_id", wordIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function listReadingProgressByExampleIds(userId: string, exampleIds: string[]) {
  if (exampleIds.length === 0) {
    return new Map<string, { id: string; status: "new" | "practicing" | "completed" | "difficult"; attempt_count: number; last_practiced_at: string | null }>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_reading_progress")
    .select("id, example_id, sense_id, status, attempt_count, last_practiced_at")
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
      .select("id, slug, hanzi, simplified, traditional, pinyin, han_viet, vietnamese_meaning, hsk_level, notes, mnemonic, word_senses(id, pinyin, part_of_speech, meaning_vi, usage_note, sense_order, is_primary, is_published), word_examples(id, chinese_text, pinyin, vietnamese_meaning, sort_order, sense_id), lesson_words!inner(lesson_id, sense_id)")
      .eq("lesson_words.lesson_id", lessonId);
  } else {
    query = query.select("id, slug, hanzi, simplified, traditional, pinyin, han_viet, vietnamese_meaning, hsk_level, notes, mnemonic, word_senses(id, pinyin, part_of_speech, meaning_vi, usage_note, sense_order, is_primary, is_published), word_examples(id, chinese_text, pinyin, vietnamese_meaning, sort_order, sense_id)");
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
    traditional: string | null;
    pinyin: string;
    han_viet: string | null;
    vietnamese_meaning: string;
    hsk_level: number;
    notes?: string | null;
    mnemonic?: string | null;
    word_senses?: Array<{
      id: string;
      pinyin: string;
      part_of_speech: string | null;
      meaning_vi: string;
      usage_note: string | null;
      sense_order: number;
      is_primary: boolean;
      is_published: boolean;
    }>;
    word_examples?: Array<{
      id: string;
      chinese_text: string;
      pinyin: string | null;
      vietnamese_meaning: string;
      sort_order: number;
      sense_id: string | null;
    }>;
    lesson_words?: Array<{ lesson_id: string; sense_id: string | null }>;
  }> | null;

  if (error) {
    throw error;
  }

  const progressRows = userId ? await listReadingProgressByWordIds(userId, (typedData ?? []).map((row) => row.id)) : [];
  const memoryRows = userId ? await listWordMemoryByWordIds(userId, (typedData ?? []).map((row) => row.id)) : [];
  const progressByKey = new Map(progressRows.map((row) => [`${row.word_id}::${row.sense_id ?? ""}`, row]));
  const legacyProgressByWordId = new Map(progressRows.filter((row) => row.sense_id === null).map((row) => [row.word_id ?? "", row]));
  const memoryByKey = new Map(memoryRows.map((row: any) => [`${row.word_id}::${row.sense_id ?? ""}`, row]));
  const legacyMemoryByWordId = new Map(memoryRows.filter((row: any) => row.sense_id === null).map((row: any) => [row.word_id, row]));
  const items = (typedData ?? []).flatMap((row) => {
    const preferredSenseId = row.lesson_words?.[0]?.sense_id ?? null;
    const cards = buildLearningSenseCards({
      word: {
        id: row.id,
        slug: row.slug,
        simplified: row.simplified,
        traditional: row.traditional,
        hanzi: row.hanzi,
        pinyin: row.pinyin,
        hanViet: row.han_viet,
        vietnameseMeaning: row.vietnamese_meaning,
        hskLevel: row.hsk_level,
        notes: row.notes ?? null,
        mnemonic: row.mnemonic ?? null,
      },
      senses: (row.word_senses ?? [])
        .filter((sense) => sense.is_published)
        .map((sense) => ({
          id: sense.id,
          pinyin: sense.pinyin,
          partOfSpeech: sense.part_of_speech,
          meaningVi: sense.meaning_vi,
          usageNote: sense.usage_note,
          senseOrder: sense.sense_order,
          isPrimary: sense.is_primary,
        })),
      examples: (row.word_examples ?? []).map((example) => ({
        id: example.id,
        chineseText: example.chinese_text,
        pinyin: example.pinyin,
        vietnameseMeaning: example.vietnamese_meaning,
        sortOrder: example.sort_order,
        senseId: example.sense_id,
      })),
      preferredSenseId,
    });

    return cards.map((card) => {
      const progress =
        progressByKey.get(`${card.wordId}::${card.senseId ?? ""}`) ??
        (card.isPrimary ? legacyProgressByWordId.get(card.wordId) : undefined);
      const memory =
        memoryByKey.get(`${card.wordId}::${card.senseId ?? ""}`) ??
        (card.isPrimary ? legacyMemoryByWordId.get(card.wordId) : undefined);

      return {
        kind: "word",
        id: card.id,
        wordId: card.wordId,
        senseId: card.senseId,
        slug: card.slug,
        hanzi: card.hanzi,
        simplified: card.simplified,
        pinyin: card.pinyin,
        vietnameseMeaning: card.vietnameseMeaning,
        hskLevel: card.hskLevel,
        partOfSpeech: card.partOfSpeech,
        promptExample: card.promptExample,
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
              schedulerType:
                memory.scheduler_type === "sm2"
                  ? "sm2"
                  : DEFAULT_LEARNING_SCHEDULER_SETTINGS.schedulerType,
              state: memory.state,
              easeFactor: Number(memory.ease_factor),
              intervalDays: memory.interval_days,
              dueAt: memory.due_at,
              reps: memory.reps,
              lapses: memory.lapses,
              learningStepIndex: memory.learning_step_index,
              fsrsStability: memory.fsrs_stability === null ? null : Number(memory.fsrs_stability),
              fsrsDifficulty: memory.fsrs_difficulty === null ? null : Number(memory.fsrs_difficulty),
              fsrsRetrievability: memory.fsrs_retrievability === null ? null : Number(memory.fsrs_retrievability),
              scheduledDays: memory.scheduled_days,
              elapsedDays: memory.elapsed_days,
              lastReviewedAt: memory.last_reviewed_at,
              lastGrade: memory.last_grade,
            }
          : null,
      } satisfies ReadingPracticeWordItem;
    });
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
      "id, chinese_text, pinyin, vietnamese_meaning, sort_order, sense_id, words!inner(id, slug, hanzi, pinyin, vietnamese_meaning, hsk_level, is_published)",
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
  const memoryRows = userId ? await listWordMemoryByWordIds(userId, linkedWordIds) : [];
  const memoryByKey = new Map(memoryRows.map((row: any) => [`${row.word_id}::${row.sense_id ?? ""}`, row]));
  const legacyMemoryByWordId = new Map(memoryRows.filter((row: any) => row.sense_id === null).map((row: any) => [row.word_id, row]));

  const items = (data ?? []).map((row) => {
    const word = normalizeRelation(row.words);
    const progress = progressByExampleId.get(row.id);
    const memory = word
      ? memoryByKey.get(`${word.id}::${row.sense_id ?? ""}`) ??
        ((row.sense_id ?? null) ? undefined : legacyMemoryByWordId.get(word.id)) ??
        legacyMemoryByWordId.get(word.id)
      : null;

    return {
      kind: "sentence",
      id: row.id,
      wordId: word?.id ?? null,
      senseId: row.sense_id ?? null,
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
            schedulerType:
              memory.scheduler_type === "sm2"
                ? "sm2"
                : DEFAULT_LEARNING_SCHEDULER_SETTINGS.schedulerType,
            state: memory.state,
            easeFactor: Number(memory.ease_factor),
            intervalDays: memory.interval_days,
            dueAt: memory.due_at,
            reps: memory.reps,
            lapses: memory.lapses,
            learningStepIndex: memory.learning_step_index,
            fsrsStability: memory.fsrs_stability === null ? null : Number(memory.fsrs_stability),
            fsrsDifficulty: memory.fsrs_difficulty === null ? null : Number(memory.fsrs_difficulty),
            fsrsRetrievability: memory.fsrs_retrievability === null ? null : Number(memory.fsrs_retrievability),
            scheduledDays: memory.scheduled_days,
            elapsedDays: memory.elapsed_days,
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
  let memory: WordMemoryRow | null = null;

  if (userId) {
    const memoryRows = await listWordMemoryByWordIds(userId, [wordId]);
    memory = memoryRows.find((row) => row.sense_id === null && row.word_id === wordId) ?? null;
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
          schedulerType:
            memory.scheduler_type === "sm2"
              ? "sm2"
              : DEFAULT_LEARNING_SCHEDULER_SETTINGS.schedulerType,
          state: memory.state,
          easeFactor: Number(memory.ease_factor),
          intervalDays: memory.interval_days,
          dueAt: memory.due_at,
          reps: memory.reps,
          lapses: memory.lapses,
          learningStepIndex: memory.learning_step_index,
          fsrsStability: memory.fsrs_stability === null ? null : Number(memory.fsrs_stability),
          fsrsDifficulty: memory.fsrs_difficulty === null ? null : Number(memory.fsrs_difficulty),
          fsrsRetrievability: memory.fsrs_retrievability === null ? null : Number(memory.fsrs_retrievability),
          scheduledDays: memory.scheduled_days,
          elapsedDays: memory.elapsed_days,
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
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const todayEnd = new Date(new Date(todayStart).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const [
    { data: readingRows, error: readingError },
    { data: writingRows, error: writingError },
    { data: listeningRows, error: listeningError },
    { count: listeningTodayCount, error: listeningTodayError },
    { data: listeningEventRows, error: listeningEventError },
  ] =
    await Promise.all([
      supabase.from("user_reading_progress").select("status").eq("user_id", userId),
      supabase.from("user_writing_progress").select("status").eq("user_id", userId),
      supabase.from("user_listening_progress").select("status, attempt_count, correct_count, almost_count, incorrect_count").eq("user_id", userId),
      supabase
        .from("practice_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("practice_type", "listening_dictation")
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd),
      supabase
        .from("practice_events")
        .select("metadata")
        .eq("user_id", userId)
        .eq("practice_type", "listening_dictation"),
    ]);

  if (readingError) {
    throw readingError;
  }

  if (writingError) {
    throw writingError;
  }

  if (listeningError) {
    throw listeningError;
  }

  if (listeningTodayError) {
    throw listeningTodayError;
  }

  if (listeningEventError) {
    throw listeningEventError;
  }

  const listeningAttempts = (listeningRows ?? []).reduce((sum, row) => sum + row.attempt_count, 0);
  const listeningCorrectCount = (listeningRows ?? []).reduce((sum, row) => sum + row.correct_count + row.almost_count, 0);
  const listeningIncorrectCount = (listeningRows ?? []).reduce((sum, row) => sum + row.incorrect_count, 0);
  const listeningAccuracyBase = listeningCorrectCount + listeningIncorrectCount;
  const listeningBySourceType = {
    word: 0,
    example: 0,
    article: 0,
    custom: 0,
  } as Record<"word" | "example" | "article" | "custom", number>;

  for (const row of listeningEventRows ?? []) {
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null;
    const sourceType = metadata?.sourceType;
    if (sourceType === "word" || sourceType === "example" || sourceType === "article" || sourceType === "custom") {
      listeningBySourceType[sourceType] += 1;
    } else {
      listeningBySourceType.custom += 1;
    }
  }

  return {
    readingCompletedCount: (readingRows ?? []).filter((row) => row.status === "completed").length,
    difficultReadingCount: (readingRows ?? []).filter((row) => row.status === "difficult").length,
    writingCharactersPracticed: (writingRows ?? []).length,
    difficultWritingCount: (writingRows ?? []).filter((row) => row.status === "difficult").length,
    listeningCompletedCount: (listeningRows ?? []).filter((row) => row.status === "completed").length,
    listeningAttempts,
    listeningAccuracy: listeningAccuracyBase > 0 ? Math.round((listeningCorrectCount / listeningAccuracyBase) * 100) : 0,
    listeningDifficultCount: (listeningRows ?? []).filter((row) => row.status === "difficult").length,
    listeningTodayCount: listeningTodayCount ?? 0,
    listeningBySourceType,
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
      "id, created_at, practice_type, result, sense_id, metadata, tts_audio_cache(id, text_preview, source_text, source_type, character_count), words(id, slug, hanzi, pinyin, vietnamese_meaning), word_senses(id, pinyin, meaning_vi), word_examples(id, chinese_text, vietnamese_meaning)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const word = normalizeRelation(row.words);
    const sense = normalizeRelation(row.word_senses);
    const sentence = normalizeRelation(row.word_examples);
    const listening = normalizeRelation(row.tts_audio_cache);
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null;

    return {
      id: row.id,
      createdAt: row.created_at,
      practiceType: row.practice_type,
      result: row.result,
      senseId: row.sense_id ?? null,
      word: word
        ? {
            id: word.id,
            slug: word.slug,
            hanzi: word.hanzi,
            pinyin: word.pinyin,
            vietnameseMeaning: word.vietnamese_meaning,
          }
        : null,
      sense: sense
        ? {
            id: sense.id,
            pinyin: sense.pinyin,
            meaningVi: sense.meaning_vi,
          }
        : null,
      sentence: sentence
        ? {
            id: sentence.id,
            chineseText: sentence.chinese_text,
            vietnameseMeaning: sentence.vietnamese_meaning,
          }
        : null,
      listening: listening
        ? {
            id: listening.id,
            chineseText: listening.source_text ?? listening.text_preview,
            sourceType: (listening.source_type as "word" | "example" | "article" | "custom" | null) ?? "custom",
            characterCount: listening.character_count,
            score: typeof metadata?.score === "number" ? metadata.score : null,
            hintUsed: metadata?.hintUsed === true,
          }
        : null,
    };
  });
}
