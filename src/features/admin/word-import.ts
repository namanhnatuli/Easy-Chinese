"use server";

import { logger } from "@/lib/logger";
import {
  revalidateAdminPaths,
  requireAdminSupabase,
} from "@/features/admin/shared";
import {
  detectImportedWordDuplicates,
  parseWordImportText,
  type ImportedWordInput,
} from "@/features/admin/word-import-parser";
import { buildUniqueWordSlug } from "@/features/public/vocabulary-slugs";
import { buildWordContentHash } from "@/features/vocabulary-sync/content-hash";

export interface WordImportState {
  ok: boolean;
  summary: {
    received: number;
    inserted: number;
    skipped: number;
    failed: number;
  };
  messages: string[];
}

const emptyImportState: WordImportState = {
  ok: false,
  summary: {
    received: 0,
    inserted: 0,
    skipped: 0,
    failed: 0,
  },
  messages: [],
};


export async function importWordsFromText({
  fileName,
  text,
}: {
  fileName: string;
  text: string;
}): Promise<WordImportState> {
  const parsedWords = parseWordImportText(fileName, text);
  const duplicateMessages = detectImportedWordDuplicates(parsedWords);

  if (parsedWords.length === 0) {
    return {
      ...emptyImportState,
      messages: ["The import file was empty."],
    };
  }

  const { supabase, auth } = await requireAdminSupabase();
  const hanzis = [...new Set(parsedWords.map((word) => word.hanzi))];
  const topicSlugs = [...new Set(parsedWords.map((word) => word.topicSlug).filter(Boolean))];
  const radicals = [...new Set(parsedWords.map((word) => word.radicalCharacter).filter(Boolean))];

  const [
    { data: existingBySlug, error: existingSlugError },
    { data: existingByHanzi, error: existingHanziError },
    { data: topics, error: topicsError },
    { data: radicalRows, error: radicalsError },
  ] = await Promise.all([
    supabase.from("words").select("slug").limit(10000),
    supabase.from("words").select("hanzi").in("hanzi", hanzis),
    topicSlugs.length > 0
      ? supabase.from("topics").select("id, slug").in("slug", topicSlugs)
      : Promise.resolve({ data: [], error: null }),
    radicals.length > 0
      ? supabase.from("radicals").select("id, radical").in("radical", radicals)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (existingSlugError) throw existingSlugError;
  if (existingHanziError) throw existingHanziError;
  if (topicsError) throw topicsError;
  if (radicalsError) throw radicalsError;

  const existingSlugs = new Set((existingBySlug ?? []).map((row) => row.slug));
  const existingHanziSet = new Set((existingByHanzi ?? []).map((row) => row.hanzi.toLowerCase()));
  const topicMap = new Map((topics ?? []).map((topic) => [topic.slug, topic.id]));
  const radicalMap = new Map((radicalRows ?? []).map((radical) => [radical.radical, radical.id]));

  const validationMessages = [...duplicateMessages];
  const acceptedWords: ImportedWordInput[] = [];

  parsedWords.forEach((word, index) => {
    if (existingHanziSet.has(word.hanzi.toLowerCase())) {
      validationMessages.push(`Row ${index + 2}: hanzi "${word.hanzi}" already exists.`);
      return;
    }

    if (word.topicSlug && !topicMap.has(word.topicSlug)) {
      validationMessages.push(`Row ${index + 2}: topic slug "${word.topicSlug}" was not found.`);
      return;
    }

    if (word.radicalCharacter && !radicalMap.has(word.radicalCharacter)) {
      validationMessages.push(`Row ${index + 2}: radical "${word.radicalCharacter}" was not found.`);
      return;
    }

    acceptedWords.push(word);
  });

  if (acceptedWords.length === 0) {
    logger.warn("admin_words_import_rejected", {
      userId: auth.user?.id ?? null,
      received: parsedWords.length,
      messages: validationMessages,
    });

    return {
      ok: false,
      summary: {
        received: parsedWords.length,
        inserted: 0,
        skipped: parsedWords.length,
        failed: validationMessages.length,
      },
      messages: validationMessages,
    };
  }

  const acceptedWordEntries = acceptedWords.map((word) => {
    const slug = buildUniqueWordSlug(
      {
        normalizedText: word.simplified,
        hanzi: word.hanzi,
        simplified: word.simplified,
      },
      existingSlugs,
    );
    existingSlugs.add(slug);
    return { word, slug };
  });

  const insertPayload = acceptedWordEntries.map(({ word, slug }) => ({
    slug,
    simplified: word.simplified,
    traditional: word.traditional,
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    han_viet: word.hanViet,
    vietnamese_meaning: word.vietnameseMeaning,
    english_meaning: word.englishMeaning,
    normalized_text: word.simplified,
    meanings_vi: word.vietnameseMeaning,
    traditional_variant: word.traditional,
    hsk_level: word.hskLevel,
    topic_id: word.topicSlug ? topicMap.get(word.topicSlug) ?? null : null,
    radical_id: word.radicalCharacter ? radicalMap.get(word.radicalCharacter) ?? null : null,
    review_status: "approved",
    ai_status: "done",
    source_confidence: "high",
    notes: word.notes,
    content_hash: buildWordContentHash({
      normalizedText: word.simplified,
      pinyin: word.pinyin,
      meaningsVi: word.vietnameseMeaning,
      hanViet: word.hanViet ?? null,
      traditionalVariant: word.traditional ?? null,
      hskLevel: word.hskLevel,
      partOfSpeech: null,
      componentBreakdownJson: null,
      radicalSummary: null,
      mnemonic: null,
      characterStructureType: null,
      structureExplanation: null,
      notes: word.notes ?? null,
      ambiguityFlag: false,
      ambiguityNote: null,
      readingCandidates: null,
    }),
    is_published: word.isPublished,
    created_by: auth.user?.id ?? null,
  }));

  const { data: insertedWords, error: insertError } = await supabase
    .from("words")
    .insert(insertPayload)
    .select("id, slug");

  if (insertError) {
    logger.error("admin_words_import_failed", insertError, {
      userId: auth.user?.id ?? null,
      received: parsedWords.length,
    });
    throw insertError;
  }

  const insertedMap = new Map((insertedWords ?? []).map((word) => [word.slug, word.id]));
  const examplePayload = acceptedWordEntries.flatMap(({ word, slug }) =>
    word.examples.map((example, index) => ({
      word_id: insertedMap.get(slug),
      chinese_text: example.chineseText,
      pinyin: example.pinyin ?? null,
      vietnamese_meaning: example.vietnameseMeaning,
      sort_order: index + 1,
    })),
  );

  if (examplePayload.length > 0) {
    const { error: examplesError } = await supabase.from("word_examples").insert(examplePayload);

    if (examplesError) {
      logger.error("admin_word_examples_import_failed", examplesError, {
        userId: auth.user?.id ?? null,
        insertedWords: insertedWords?.length ?? 0,
      });
      throw examplesError;
    }
  }

  revalidateAdminPaths(["/admin", "/admin/words", "/admin/import", "/vocabulary", "/lessons"]);

  logger.info("admin_words_import_succeeded", {
    userId: auth.user?.id ?? null,
    received: parsedWords.length,
    inserted: insertedWords?.length ?? 0,
    skipped: parsedWords.length - acceptedWords.length,
  });

  return {
    ok: true,
    summary: {
      received: parsedWords.length,
      inserted: insertedWords?.length ?? 0,
      skipped: parsedWords.length - acceptedWords.length,
      failed: validationMessages.length,
    },
    messages:
      validationMessages.length > 0
        ? validationMessages
        : [`Imported ${insertedWords?.length ?? 0} words successfully.`],
  };
}

export async function importWordsAction(
  _previousState: WordImportState,
  formData: FormData,
): Promise<WordImportState> {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return {
      ...emptyImportState,
      messages: ["Choose a CSV or JSON file first."],
    };
  }

  try {
    const text = await file.text();
    return await importWordsFromText({
      fileName: file.name,
      text,
    });
  } catch (error) {
    logger.error("admin_words_import_unhandled_error", error, {
      fileName: file.name,
    });

    const message = error instanceof Error ? error.message : "Word import failed.";

    return {
      ...emptyImportState,
      messages: [message],
    };
  }
}
