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
  let query = supabase
    .from("user_reading_progress")
    .select("id, status, attempt_count, last_practiced_at")
    .eq("user_id", userId)
    .eq("practice_type", input.practiceType);

  query =
    input.practiceType === "word"
      ? query.eq("word_id", input.wordId!)
      : query.eq("example_id", input.exampleId!);

  const { data, error } = await query.maybeSingle();

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

    return input.wordId ?? null;
  }

  const { data, error } = await supabase
    .from("word_examples")
    .select("id, word_id, words!inner(id, is_published)")
    .eq("id", input.exampleId!)
    .eq("words.is_published", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Reading practice sentence is not available.");
  }

  return data.word_id ?? null;
}

async function insertPracticeEvent(
  supabase: SupabaseClient,
  payload: {
    user_id: string;
    word_id: string | null;
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
    exampleId: input.exampleId ?? null,
    grade: input.grade,
  });

  await insertPracticeEvent(supabase, {
    user_id: userId,
    word_id: input.practiceType === "word" ? input.wordId ?? null : null,
    example_id: input.practiceType === "sentence" ? input.exampleId ?? null : null,
    practice_type: input.practiceType === "word" ? "reading_word" : "reading_sentence",
    result: practiceResult,
    created_at: now.toISOString(),
  });

  if (linkedWordId) {
    await persistWordMemoryGrade({
      supabase,
      userId,
      wordId: linkedWordId,
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
        ? `practice:reading-word:${input.wordId}:${getUtcDateKey(now)}`
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
