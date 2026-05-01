import type { SupabaseClient } from "@supabase/supabase-js";

import { evaluateListeningDictationAnswer } from "@/features/listening/evaluation";
import { normalizeListeningSourceType, resolveListeningSourceText } from "@/features/listening/helpers";
import type {
  ListeningPersistedOutcome,
  ListeningPracticeMutationInput,
  ListeningProgressSnapshot,
} from "@/features/listening/types";
import { deriveListeningProgressStatus } from "@/features/listening/helpers";
import { awardXp, unlockEligibleAchievements } from "@/features/gamification/persistence";
import { getXpForListeningResult } from "@/features/gamification/leveling";
import { persistLearningStats } from "@/features/memory/persistence";
import { logger } from "@/lib/logger";

function getUtcDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function readExistingListeningProgress(
  supabase: SupabaseClient,
  userId: string,
  ttsAudioCacheId: string,
): Promise<ListeningProgressSnapshot | null> {
  const { data, error } = await supabase
    .from("user_listening_progress")
    .select(
      "id, status, attempt_count, correct_count, almost_count, incorrect_count, skipped_count, best_score, last_input, last_practiced_at",
    )
    .eq("user_id", userId)
    .eq("tts_audio_cache_id", ttsAudioCacheId)
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
    correctCount: data.correct_count,
    almostCount: data.almost_count,
    incorrectCount: data.incorrect_count,
    skippedCount: data.skipped_count,
    bestScore: Number(data.best_score ?? 0),
    lastInput: data.last_input,
    lastPracticedAt: data.last_practiced_at,
  };
}

async function readListeningTarget(
  supabase: SupabaseClient,
  ttsAudioCacheId: string,
) {
  const { data, error } = await supabase
    .from("tts_audio_cache")
    .select("id, text_preview, source_text, source_type, source_ref_id, source_metadata, character_count, language_code")
    .eq("id", ttsAudioCacheId)
    .eq("language_code", "zh-CN")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || !resolveListeningSourceText(data.source_text, data.text_preview)) {
    throw new Error("Listening practice item is not available.");
  }

  return data;
}

function buildListeningProgressPatch({
  existing,
  result,
  score,
  lastInput,
  now,
}: {
  existing: ListeningProgressSnapshot | null;
  result: "correct" | "almost" | "incorrect" | "skipped";
  score: number;
  lastInput: string;
  now: Date;
}) {
  return {
    status: deriveListeningProgressStatus({
      existing,
      result,
    }),
    attempt_count: (existing?.attemptCount ?? 0) + 1,
    correct_count: (existing?.correctCount ?? 0) + (result === "correct" ? 1 : 0),
    almost_count: (existing?.almostCount ?? 0) + (result === "almost" ? 1 : 0),
    incorrect_count: (existing?.incorrectCount ?? 0) + (result === "incorrect" ? 1 : 0),
    skipped_count: (existing?.skippedCount ?? 0) + (result === "skipped" ? 1 : 0),
    best_score: Math.max(existing?.bestScore ?? 0, score),
    last_input: lastInput,
    last_practiced_at: now.toISOString(),
  };
}

export async function persistListeningPracticeOutcome({
  supabase,
  userId,
  input,
}: {
  supabase: SupabaseClient;
  userId: string;
  input: ListeningPracticeMutationInput;
}): Promise<ListeningPersistedOutcome> {
  const target = await readListeningTarget(supabase, input.ttsAudioCacheId);
  const existing = await readExistingListeningProgress(supabase, userId, input.ttsAudioCacheId);
  const now = new Date();
  const sourceText = resolveListeningSourceText(target.source_text, target.text_preview);
  const sourceType = normalizeListeningSourceType(target.source_type);
  const evaluation = input.skipped
    ? {
        result: "skipped" as const,
        score: 0,
        normalizedExpected: "",
        normalizedAnswer: "",
      }
    : evaluateListeningDictationAnswer({
        expected: sourceText,
        answer: input.answer,
        hintUsed: input.hintUsed,
      });

  const patch = buildListeningProgressPatch({
    existing,
    result: evaluation.result,
    score: evaluation.score,
    lastInput: input.answer,
    now,
  });

  logger.info("listening_practice_persist_started", {
    userId,
    ttsAudioCacheId: input.ttsAudioCacheId,
    result: evaluation.result,
    score: evaluation.score,
    hintUsed: input.hintUsed,
    skipped: input.skipped ?? false,
  });

  const { error: eventError } = await supabase.from("practice_events").insert({
    user_id: userId,
    word_id: null,
    example_id: null,
    tts_audio_cache_id: input.ttsAudioCacheId,
    practice_type: "listening_dictation",
    result: evaluation.result,
    created_at: now.toISOString(),
    metadata: {
      ttsAudioCacheId: input.ttsAudioCacheId,
      score: evaluation.score,
      sourceType,
      sourceRefId: target.source_ref_id,
      characterCount: target.character_count,
      hintUsed: input.hintUsed,
      skipped: input.skipped ?? false,
    },
  });

  if (eventError) {
    throw eventError;
  }

  if (existing) {
    const { error } = await supabase
      .from("user_listening_progress")
      .update(patch)
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("user_listening_progress").insert({
      user_id: userId,
      tts_audio_cache_id: input.ttsAudioCacheId,
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
    amount: getXpForListeningResult(evaluation.result),
    reason: `practice:listening:${evaluation.result}`,
    sourceKey: `practice:listening:${input.ttsAudioCacheId}:${getUtcDateKey(now)}`,
  });

  await unlockEligibleAchievements({
    supabase,
    userId,
    now,
  });

  return {
    result: evaluation.result,
    score: evaluation.score,
    expectedText: sourceText,
    normalizedExpected: evaluation.normalizedExpected,
    normalizedAnswer: evaluation.normalizedAnswer,
  };
}
