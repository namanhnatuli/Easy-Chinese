import { createSupabaseServerClient } from "@/lib/supabase/server";

import type {
  DailyGoalProgress,
  DueReviewItem,
  RecommendedArticleItem,
  SuggestedLessonItem,
} from "@/features/progress/types";
import {
  getDefaultDailyGoal,
  getVisibleStreakCount,
  normalizeLearningSchedulerSettings,
} from "@/features/memory/spaced-repetition";
import type { LearningSchedulerSettings } from "@/features/memory/spaced-repetition";

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

async function listDueMemoryWordIds(userId: string, nowIso: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_word_memory")
    .select("word_id")
    .eq("user_id", userId)
    .not("due_at", "is", null)
    .lte("due_at", nowIso);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.word_id));
}

async function listPublishedWordsByIds(wordIds: string[]) {
  if (wordIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("words")
    .select("id, slug, simplified, traditional, hanzi, pinyin, han_viet, vietnamese_meaning, hsk_level")
    .in("id", wordIds)
    .eq("is_published", true);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function listSuggestedNewWords(userId: string, limit: number) {
  if (limit <= 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: memoryRows, error: memoryError }, { data: dueWords, error: lessonError }] = await Promise.all([
    supabase.from("user_word_memory").select("word_id").eq("user_id", userId),
    supabase
      .from("lesson_words")
      .select(
        "sort_order, lessons!inner(id, slug, title, hsk_level, sort_order, is_published), words!inner(id, slug, simplified, traditional, hanzi, pinyin, han_viet, vietnamese_meaning, hsk_level, is_published)",
      )
      .eq("lessons.is_published", true)
      .eq("words.is_published", true)
      .order("sort_order", { foreignTable: "lessons", ascending: true })
      .order("sort_order", { ascending: true })
      .limit(limit * 4),
  ]);

  if (memoryError) {
    throw memoryError;
  }

  if (lessonError) {
    throw lessonError;
  }

  const knownWordIds = new Set((memoryRows ?? []).map((row) => row.word_id));
  const items: Array<{
    id: string;
    slug: string;
    simplified: string;
    traditional: string | null;
    hanzi: string;
    pinyin: string;
    han_viet: string | null;
    vietnamese_meaning: string;
    hsk_level: number;
  }> = [];

  for (const row of dueWords ?? []) {
    const word = normalizeRelation(row.words);
    if (!word || knownWordIds.has(word.id) || items.some((item) => item.id === word.id)) {
      continue;
    }

    items.push(word);
    if (items.length >= limit) {
      break;
    }
  }

  return items;
}

export async function listPersonalizedReviewQueue(
  userId: string,
  limit = 30,
  options?: { includeNew?: boolean },
): Promise<DueReviewItem[]> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();

  const { data: memoryRows, error: memoryError } = await supabase
    .from("user_word_memory")
    .select(
      "word_id, scheduler_type, state, ease_factor, interval_days, due_at, reps, lapses, learning_step_index, fsrs_stability, fsrs_difficulty, fsrs_retrievability, scheduled_days, elapsed_days, last_reviewed_at, last_grade",
    )
    .eq("user_id", userId)
    .lte("due_at", now.toISOString())
    .order("due_at", { ascending: true, nullsFirst: true })
    .limit(500);

  if (memoryError) {
    throw memoryError;
  }

  const dueWords = await listPublishedWordsByIds((memoryRows ?? []).map((row) => row.word_id));
  const newWords = options?.includeNew ? await listSuggestedNewWords(userId, Math.max(limit - dueWords.length, 0)) : [];
  const queueWords = [...dueWords];

  for (const word of newWords) {
    if (!queueWords.some((item) => item.id === word.id)) {
      queueWords.push(word);
    }
  }

  const memoryMap = new Map((memoryRows ?? []).map((row) => [row.word_id, row]));

  return queueWords
    .map((word) => {
      const memory = memoryMap.get(word.id);
      const intervalDays = memory?.interval_days ?? 0;
      const queueSource: DueReviewItem["queueSource"] = memory ? "due" : "new";

      return {
        id: word.id,
        slug: word.slug,
        simplified: word.simplified,
        traditional: word.traditional,
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        hanViet: word.han_viet,
        vietnameseMeaning: word.vietnamese_meaning,
        sortOrder: 0,
        status:
          memory?.state === "review"
            ? intervalDays >= 30
              ? "mastered"
              : "review"
            : memory?.state === "new"
              ? "new"
              : "learning",
        memoryState: memory?.state ?? "new",
        schedulerType: memory?.scheduler_type === "fsrs" ? "fsrs" : "sm2",
        dueAt: memory?.due_at ?? null,
        lastReviewedAt: memory?.last_reviewed_at ?? null,
        intervalDays,
        streakCount: Math.max((memory?.reps ?? 0) - (memory?.lapses ?? 0), 0),
        correctCount: Math.max((memory?.reps ?? 0) - (memory?.lapses ?? 0), 0),
        incorrectCount: memory?.lapses ?? 0,
        queueSource,
        reps: memory?.reps ?? 0,
        lapses: memory?.lapses ?? 0,
        easeFactor: Number(memory?.ease_factor ?? 2.5),
        learningStepIndex: memory?.learning_step_index ?? 0,
        fsrsStability: memory?.fsrs_stability === null || memory?.fsrs_stability === undefined ? null : Number(memory.fsrs_stability),
        fsrsDifficulty: memory?.fsrs_difficulty === null || memory?.fsrs_difficulty === undefined ? null : Number(memory.fsrs_difficulty),
        fsrsRetrievability:
          memory?.fsrs_retrievability === null || memory?.fsrs_retrievability === undefined
            ? null
            : Number(memory.fsrs_retrievability),
        scheduledDays: memory?.scheduled_days ?? 0,
        elapsedDays: memory?.elapsed_days ?? 0,
        lastGrade: memory?.last_grade ?? null,
      } satisfies DueReviewItem;
    })
    .sort((left, right) => {
      const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return left.hanzi.localeCompare(right.hanzi, "zh-Hans-CN");
    })
    .slice(0, limit)
    .map((item, index) => ({ ...item, sortOrder: index + 1 }));
}

export async function getUserLearningSchedulerSettings(userId: string): Promise<LearningSchedulerSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_learning_stats")
    .select("scheduler_type, desired_retention, maximum_interval_days")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeLearningSchedulerSettings({
    schedulerType: data?.scheduler_type,
    desiredRetention: data?.desired_retention === undefined || data?.desired_retention === null ? undefined : Number(data.desired_retention),
    maximumIntervalDays: data?.maximum_interval_days ?? undefined,
  });
}

export async function getDailyGoalProgress(userId: string): Promise<DailyGoalProgress> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const from = dayStart.toISOString();
  const to = dayEnd.toISOString();

  const [
    dueMemoryWordIds,
    { data: statsRow, error: statsError },
    { count: reviewCount, error: reviewError },
  ] = await Promise.all([
    listDueMemoryWordIds(userId, nowIso),
    supabase
      .from("user_learning_stats")
      .select("streak_count, last_active_date, daily_goal, scheduler_type, desired_retention, maximum_interval_days")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("review_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("grade", ["hard", "good", "easy"])
      .gte("reviewed_at", from)
      .lt("reviewed_at", to),
  ]);

  if (statsError) {
    throw statsError;
  }

  if (reviewError) {
    throw reviewError;
  }

  const completedToday = reviewCount ?? 0;
  const dailyGoal = statsRow?.daily_goal ?? getDefaultDailyGoal();
  const schedulerSettings = normalizeLearningSchedulerSettings({
    schedulerType: statsRow?.scheduler_type,
    desiredRetention: statsRow?.desired_retention === undefined || statsRow?.desired_retention === null ? undefined : Number(statsRow.desired_retention),
    maximumIntervalDays: statsRow?.maximum_interval_days ?? undefined,
  });

  return {
    dailyGoal,
    completedToday,
    remainingToday: Math.max(dailyGoal - completedToday, 0),
    streakCount: getVisibleStreakCount(
      statsRow
        ? {
            streakCount: statsRow.streak_count,
            lastActiveDate: statsRow.last_active_date,
            dailyGoal: statsRow.daily_goal,
            schedulerType: schedulerSettings.schedulerType,
            desiredRetention: schedulerSettings.desiredRetention,
            maximumIntervalDays: schedulerSettings.maximumIntervalDays,
          }
        : null,
      now,
    ),
    wordsToReviewToday: dueMemoryWordIds.size,
    difficultWordsCount: 0,
  };
}

export async function listRecommendedLessonsForUser(
  userId: string,
  limit = 3,
): Promise<SuggestedLessonItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data: lessonProgressRows, error: progressError } = await supabase
    .from("user_lesson_progress")
    .select("lesson_id, completion_percent, lessons!inner(id, title, slug, hsk_level, description, sort_order, is_published)")
    .eq("user_id", userId)
    .eq("lessons.is_published", true)
    .order("completion_percent", { ascending: false });

  if (progressError) {
    throw progressError;
  }

  const inProgress = (lessonProgressRows ?? [])
    .map((row) => {
      const lesson = normalizeRelation(row.lessons);
      if (!lesson) {
        return null;
      }

      return {
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        hskLevel: lesson.hsk_level,
        description: lesson.description,
        completionPercent: Number(row.completion_percent),
        sortOrder: lesson.sort_order,
      };
    })
    .filter(
      (lesson): lesson is {
        id: string;
        title: string;
        slug: string;
        hskLevel: number;
        description: string | null;
        completionPercent: number;
        sortOrder: number;
      } => lesson !== null && lesson.completionPercent > 0 && lesson.completionPercent < 100,
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);

  if (inProgress.length >= limit) {
    return inProgress.slice(0, limit).map(({ completionPercent: _completionPercent, sortOrder: _sortOrder, ...lesson }) => lesson);
  }

  const highestStartedLevel = inProgress[0]?.hskLevel ?? 1;
  const startedIds = new Set((lessonProgressRows ?? []).map((row) => row.lesson_id));
  const { data: lessonRows, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title, slug, hsk_level, description, sort_order")
    .eq("is_published", true)
    .gte("hsk_level", highestStartedLevel)
    .order("hsk_level")
    .order("sort_order")
    .limit(limit * 3);

  if (lessonsError) {
    throw lessonsError;
  }

  const recommended: SuggestedLessonItem[] = inProgress.map(({ completionPercent: _completionPercent, sortOrder: _sortOrder, ...lesson }) => lesson);

  for (const lesson of lessonRows ?? []) {
    if (startedIds.has(lesson.id) || recommended.some((item) => item.id === lesson.id)) {
      continue;
    }

    recommended.push({
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug,
      hskLevel: lesson.hsk_level,
      description: lesson.description,
    });

    if (recommended.length >= limit) {
      break;
    }
  }

  return recommended.slice(0, limit);
}

export async function listRecommendedArticlesForUser(
  userId: string,
  limit = 3,
): Promise<RecommendedArticleItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data: articleProgressRows, error: progressError } = await supabase
    .from("user_article_progress")
    .select("article_id, last_read_at, learning_articles!inner(id, hsk_level, is_published)")
    .eq("user_id", userId)
    .eq("learning_articles.is_published", true)
    .order("last_read_at", { ascending: false, nullsFirst: false })
    .limit(8);

  const recentArticleIds = (articleProgressRows ?? []).map((row) => row.article_id);
  const { data: recentTagRows, error: recentTagError } = recentArticleIds.length
    ? await supabase
        .from("learning_article_tag_links")
        .select("article_id, tag_id, learning_article_tags(name)")
        .in("article_id", recentArticleIds)
    : { data: [], error: null };

  if (progressError) {
    throw progressError;
  }

  if (recentTagError) {
    throw recentTagError;
  }

  const recentTagIds = new Set<string>();
  const recentTagNames = new Map<string, string>();
  let preferredLevel = 1;

  for (const row of articleProgressRows ?? []) {
    const article = normalizeRelation(row.learning_articles);
    if (article?.hsk_level) {
      preferredLevel = Math.max(preferredLevel, article.hsk_level);
    }

    for (const tagLink of (recentTagRows ?? []).filter((tagRow) => tagRow.article_id === row.article_id)) {
      if (!tagLink.tag_id) {
        continue;
      }

      recentTagIds.add(tagLink.tag_id);
      const tag = normalizeRelation(tagLink.learning_article_tags);
      if (tag?.name) {
        recentTagNames.set(tagLink.tag_id, tag.name);
      }
    }
  }

  const { data: articleRows, error: articleError } = await supabase
    .from("learning_articles")
    .select(
      "id, title, slug, summary, hsk_level, learning_article_tag_links(tag_id, learning_article_tags(name))",
    )
    .eq("is_published", true)
    .gte("hsk_level", Math.max(preferredLevel - 1, 1))
    .lte("hsk_level", preferredLevel + 1)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit * 6);

  if (articleError) {
    throw articleError;
  }

  return (articleRows ?? [])
    .map((article) => {
      const matchingTagNames = (article.learning_article_tag_links ?? [])
        .filter((tagLink) => recentTagIds.has(tagLink.tag_id))
        .map((tagLink) => normalizeRelation(tagLink.learning_article_tags)?.name ?? recentTagNames.get(tagLink.tag_id))
        .filter((name): name is string => Boolean(name));

      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        hskLevel: article.hsk_level,
        matchingTagNames,
      } satisfies RecommendedArticleItem;
    })
    .sort((left, right) => {
      const tagDelta = right.matchingTagNames.length - left.matchingTagNames.length;
      if (tagDelta !== 0) {
        return tagDelta;
      }

      return (left.hskLevel ?? 0) - (right.hskLevel ?? 0);
    })
    .filter((article, index, items) => items.findIndex((item) => item.id === article.id) === index)
    .slice(0, limit);
}
