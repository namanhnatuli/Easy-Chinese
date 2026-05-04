import type { SupabaseClient } from "@supabase/supabase-js";

import {
  awardXp,
  unlockEligibleAchievements,
} from "@/features/gamification/persistence";
import {
  getXpForReadingResult,
  getXpForWritingResult,
} from "@/features/gamification/leveling";
import { persistLearningStats, persistWordMemoryGrade } from "@/features/memory/persistence";
import { mapMemoryGradeToPracticeResult } from "@/features/memory/spaced-repetition";
import { buildPracticeProgressPatch, splitWordIntoHanziCharacters } from "@/features/practice/helpers";
import type {
  ReadingPracticeMutationInput,
  ReadingProgressSnapshot,
  WritingPracticeMutationInput,
  WritingProgressSnapshot,
} from "@/features/practice/types";
import { logger } from "@/lib/logger";

function getUtcDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function readExistingReadingProgress(
  supabase: SupabaseClient,
  userId: string,
  input: ReadingPracticeMutationInput,
): Promise<ReadingProgressSnapshot | null> {
  const selectColumns = "id, status, attempt_count, last_practiced_at";
  let data: { id: string; status: "new" | "practicing" | "completed" | "difficult"; attempt_count: number; last_practiced_at: string | null } | null = null;
  let error: unknown = null;

  if (input.practiceType === "word") {
    if (input.senseId) {
      const exact = await supabase
        .from("user_reading_progress")
        .select(selectColumns)
        .eq("user_id", userId)
        .eq("practice_type", "word")
        .eq("word_id", input.wordId!)
        .eq("sense_id", input.senseId)
        .maybeSingle();

      if (exact.error) {
        throw exact.error;
      }

      data = exact.data;

      if (!data) {
        const legacy = await supabase
          .from("user_reading_progress")
          .select(selectColumns)
          .eq("user_id", userId)
          .eq("practice_type", "word")
          .eq("word_id", input.wordId!)
          .is("sense_id", null)
          .maybeSingle();

        data = legacy.data;
        error = legacy.error;
      }
    } else {
      const result = await supabase
        .from("user_reading_progress")
        .select(selectColumns)
        .eq("user_id", userId)
        .eq("practice_type", "word")
        .eq("word_id", input.wordId!)
        .is("sense_id", null)
        .maybeSingle();

      data = result.data;
      error = result.error;
    }
  } else {
    const result = await supabase
      .from("user_reading_progress")
      .select(selectColumns)
      .eq("user_id", userId)
      .eq("practice_type", "sentence")
      .eq("example_id", input.exampleId!)
      .maybeSingle();

    data = result.data;
    error = result.error;
  }

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    status: data.status,
    attemptCount: data.attempt_count,
    lastPracticedAt: data.last_practiced_at,
  };
}

async function validateReadingTarget(
  supabase: SupabaseClient,
  input: ReadingPracticeMutationInput,
) {
  if (input.practiceType === "word") {
    if (input.senseId) {
      const { data, error } = await supabase
        .from("word_senses")
        .select("id, word_id, is_published, words!inner(id, is_published)")
        .eq("id", input.senseId)
        .eq("word_id", input.wordId!)
        .eq("is_published", true)
        .eq("words.is_published", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Reading practice sense is not available.");
      }

      return {
        wordId: input.wordId ?? null,
        senseId: input.senseId ?? null,
      };
    }

    const { data, error } = await supabase
      .from("words")
      .select("id, is_published")
      .eq("id", input.wordId!)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Reading practice word is not available.");
    }

    return {
      wordId: input.wordId ?? null,
      senseId: null,
    };
  }

  const { data, error } = await supabase
    .from("word_examples")
    .select("id, word_id, sense_id, words!inner(id, is_published)")
    .eq("id", input.exampleId!)
    .eq("words.is_published", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Reading practice sentence is not available.");
  }

  return {
    wordId: data.word_id ?? null,
    senseId: data.sense_id ?? null,
  };
}

async function insertPracticeEvent(
  supabase: SupabaseClient,
  payload: {
    user_id: string;
    word_id: string | null;
    sense_id: string | null;
    example_id: string | null;
    practice_type: "reading_word" | "reading_sentence" | "writing_character";
    result: "completed" | "difficult" | "skipped";
    created_at: string;
  },
) {
  const { error } = await supabase.from("practice_events").insert(payload);

  if (error) {
    throw error;
  }
}

export async function persistReadingPracticeOutcome({
  supabase,
  userId,
  input,
}: {
  supabase: SupabaseClient;
  userId: string;
  input: ReadingPracticeMutationInput;
}) {
  const linkedWordId = await validateReadingTarget(supabase, input);
  const existing = await readExistingReadingProgress(supabase, userId, input);
  const now = new Date();
  const practiceResult = mapMemoryGradeToPracticeResult(input.grade);
  const patch = buildPracticeProgressPatch(existing, practiceResult, now);

  logger.info("reading_practice_persist_started", {
    userId,
    practiceType: input.practiceType,
    wordId: input.wordId ?? null,
    senseId: input.senseId ?? null,
    exampleId: input.exampleId ?? null,
    grade: input.grade,
  });

  await insertPracticeEvent(supabase, {
    user_id: userId,
    word_id: input.practiceType === "word" ? input.wordId ?? null : null,
    sense_id: linkedWordId.senseId,
    example_id: input.practiceType === "sentence" ? input.exampleId ?? null : null,
    practice_type: input.practiceType === "word" ? "reading_word" : "reading_sentence",
    result: practiceResult,
    created_at: now.toISOString(),
  });

  if (linkedWordId.wordId) {
    await persistWordMemoryGrade({
      supabase,
      userId,
      wordId: linkedWordId.wordId,
      senseId: linkedWordId.senseId,
      grade: input.grade,
      now,
      practiceType: input.practiceType === "word" ? "reading_word" : "reading_sentence",
    });
  }

  if (existing) {
    const { error } = await supabase
      .from("user_reading_progress")
      .update(patch)
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("user_reading_progress").insert({
      user_id: userId,
      word_id: input.practiceType === "word" ? input.wordId ?? null : null,
      sense_id: linkedWordId.senseId,
      example_id: input.practiceType === "sentence" ? input.exampleId ?? null : null,
      practice_type: input.practiceType,
      ...patch,
    });

    if (error) {
      throw error;
    }
  }

  await persistLearningStats({
    supabase,
    userId,
    now,
  });

  await awardXp({
    supabase,
    userId,
    amount: getXpForReadingResult(practiceResult),
    reason: `practice:reading:${input.practiceType}:${practiceResult}`,
    sourceKey:
      input.practiceType === "word"
        ? `practice:reading-word:${input.wordId}:${input.senseId ?? "word"}:${getUtcDateKey(now)}`
        : `practice:reading-sentence:${input.exampleId}:${getUtcDateKey(now)}`,
  });

  await unlockEligibleAchievements({
    supabase,
    userId,
    now,
  });
}

async function readExistingWritingProgress(
  supabase: SupabaseClient,
  userId: string,
  input: WritingPracticeMutationInput,
): Promise<WritingProgressSnapshot | null> {
  const { data, error } = await supabase
    .from("user_writing_progress")
    .select("id, status, attempt_count, last_practiced_at")
    .eq("user_id", userId)
    .eq("word_id", input.wordId)
    .eq("character", input.character)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    status: data.status,
    attemptCount: data.attempt_count,
    lastPracticedAt: data.last_practiced_at,
  };
}

async function validateWritingTarget(
  supabase: SupabaseClient,
  input: WritingPracticeMutationInput,
) {
  const { data, error } = await supabase
    .from("words")
    .select("id, hanzi, simplified")
    .eq("id", input.wordId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Writing practice word is not available.");
  }

  const characters = splitWordIntoHanziCharacters(data.hanzi || data.simplified);
  if (!characters.includes(input.character)) {
    throw new Error("Writing practice character does not belong to this word.");
  }
}

export async function persistWritingPracticeOutcome({
  supabase,
  userId,
  input,
}: {
  supabase: SupabaseClient;
  userId: string;
  input: WritingPracticeMutationInput;
}) {
  await validateWritingTarget(supabase, input);
  const existing = await readExistingWritingProgress(supabase, userId, input);
  const now = new Date();
  const practiceResult = mapMemoryGradeToPracticeResult(input.grade);
  const patch = buildPracticeProgressPatch(existing, practiceResult, now);

  logger.info("writing_practice_persist_started", {
    userId,
    wordId: input.wordId,
    character: input.character,
    grade: input.grade,
  });

  await insertPracticeEvent(supabase, {
    user_id: userId,
    word_id: input.wordId,
    sense_id: null,
    example_id: null,
    practice_type: "writing_character",
    result: practiceResult,
    created_at: now.toISOString(),
  });

  await persistWordMemoryGrade({
    supabase,
    userId,
    wordId: input.wordId,
    grade: input.grade,
    now,
    practiceType: "writing_character",
  });

  if (existing) {
    const { error } = await supabase
      .from("user_writing_progress")
      .update(patch)
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("user_writing_progress").insert({
      user_id: userId,
      word_id: input.wordId,
      character: input.character,
      ...patch,
    });

    if (error) {
      throw error;
    }
  }

  await persistLearningStats({
    supabase,
    userId,
    now,
  });

  await awardXp({
    supabase,
    userId,
    amount: getXpForWritingResult(practiceResult),
    reason: `practice:writing:${practiceResult}`,
    sourceKey: `practice:writing:${input.wordId}:${input.character}:${getUtcDateKey(now)}`,
  });

  await unlockEligibleAchievements({
    supabase,
    userId,
    now,
  });
}
