import "server-only";

import { requireAdminSupabase } from "@/features/admin/shared";
import type { ExistingWordPreviewSnapshot } from "@/features/vocabulary-sync/matching";
import type { ParsedVocabSyncRow } from "@/features/vocabulary-sync/normalize";

export async function fetchExistingWordCandidates(rows: ParsedVocabSyncRow[]) {
  const { supabase } = await requireAdminSupabase();
  const externalIds = [
    ...new Set(
      rows
        .map((row) => row.normalizedPayload.externalId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const sourceRowKeys = [...new Set(rows.map((row) => row.sourceRowKey).filter(Boolean))];
  const normalizedTexts = [
    ...new Set(
      rows
        .map((row) => row.normalizedPayload.normalizedText)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const wordMap = new Map<string, ExistingWordPreviewSnapshot>();

  async function collectWords(queryBuilder: PromiseLike<{ data: any[] | null; error: unknown }>) {
    const { data, error } = await queryBuilder;

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      wordMap.set(row.id, {
        id: row.id,
        slug: row.slug,
        externalSource: row.external_source,
        externalId: row.external_id,
        sourceRowKey: row.source_row_key,
        contentHash: row.content_hash,
        normalizedText: row.normalized_text,
        simplified: row.simplified,
        hanzi: row.hanzi,
        pinyin: row.pinyin,
        partOfSpeech: row.part_of_speech,
        meaningsVi: row.meanings_vi,
        hanViet: row.han_viet,
        traditionalVariant: row.traditional_variant,
        hskLevel: row.hsk_level,
        componentBreakdownJson: row.component_breakdown_json,
        radicalSummary: row.radical_summary,
        mnemonic: row.mnemonic,
        characterStructureType: row.character_structure_type,
        structureExplanation: row.structure_explanation,
        notes: row.notes,
        ambiguityFlag: row.ambiguity_flag,
        ambiguityNote: row.ambiguity_note,
        readingCandidates: row.reading_candidates,
        reviewStatus: row.review_status,
        aiStatus: row.ai_status,
        sourceConfidence: row.source_confidence,
        lastSourceUpdatedAt: row.last_source_updated_at,
        mainRadicals: [],
        topicTags: [],
        examples: [],
      });
    }
  }

  const CHUNK_SIZE = 100;

  if (externalIds.length > 0) {
    for (let i = 0; i < externalIds.length; i += CHUNK_SIZE) {
      await collectWords(
        supabase
          .from("words")
          .select(
            "id, slug, external_source, external_id, source_row_key, content_hash, normalized_text, simplified, hanzi, pinyin, part_of_speech, meanings_vi, han_viet, traditional_variant, hsk_level, component_breakdown_json, radical_summary, mnemonic, character_structure_type, structure_explanation, notes, ambiguity_flag, ambiguity_note, reading_candidates, review_status, ai_status, source_confidence, last_source_updated_at",
          )
          .eq("external_source", "google_sheets")
          .in("external_id", externalIds.slice(i, i + CHUNK_SIZE)),
      );
    }
  }

  if (sourceRowKeys.length > 0) {
    for (let i = 0; i < sourceRowKeys.length; i += CHUNK_SIZE) {
      await collectWords(
        supabase
          .from("words")
          .select(
            "id, slug, external_source, external_id, source_row_key, content_hash, normalized_text, simplified, hanzi, pinyin, part_of_speech, meanings_vi, han_viet, traditional_variant, hsk_level, component_breakdown_json, radical_summary, mnemonic, character_structure_type, structure_explanation, notes, ambiguity_flag, ambiguity_note, reading_candidates, review_status, ai_status, source_confidence, last_source_updated_at",
          )
          .eq("external_source", "google_sheets")
          .in("source_row_key", sourceRowKeys.slice(i, i + CHUNK_SIZE)),
      );
    }
  }

  if (normalizedTexts.length > 0) {
    for (let i = 0; i < normalizedTexts.length; i += CHUNK_SIZE) {
      await collectWords(
        supabase
          .from("words")
          .select(
            "id, slug, external_source, external_id, source_row_key, content_hash, normalized_text, simplified, hanzi, pinyin, part_of_speech, meanings_vi, han_viet, traditional_variant, hsk_level, component_breakdown_json, radical_summary, mnemonic, character_structure_type, structure_explanation, notes, ambiguity_flag, ambiguity_note, reading_candidates, review_status, ai_status, source_confidence, last_source_updated_at",
          )
          .in("normalized_text", normalizedTexts.slice(i, i + CHUNK_SIZE)),
      );
    }
  }

  const wordIds = [...wordMap.keys()];
  if (wordIds.length === 0) {
    return [];
  }

  const examples: any[] = [];
  const tagLinks: any[] = [];
  const radicalLinks: any[] = [];

  for (let i = 0; i < wordIds.length; i += CHUNK_SIZE) {
    const chunk = wordIds.slice(i, i + CHUNK_SIZE);
    const [
      { data: exData, error: exError },
      { data: tlData, error: tlError },
      { data: rlData, error: rlError },
    ] = await Promise.all([
      supabase
        .from("word_examples")
        .select("word_id, chinese_text, pinyin, vietnamese_meaning, sort_order")
        .in("word_id", chunk),
      supabase
        .from("word_tag_links")
        .select("word_id, word_tags(slug)")
        .in("word_id", chunk),
      supabase
        .from("word_radicals")
        .select("word_id, radicals(radical), sort_order")
        .in("word_id", chunk),
    ]);

    if (exError) throw exError;
    if (tlError) throw tlError;
    if (rlError) throw rlError;

    if (exData) examples.push(...exData);
    if (tlData) tagLinks.push(...tlData);
    if (rlData) radicalLinks.push(...rlData);
  }

  for (const example of examples ?? []) {
    const target = wordMap.get(example.word_id);
    if (!target) {
      continue;
    }

    target.examples.push({
      chineseText: example.chinese_text,
      pinyin: example.pinyin,
      vietnameseMeaning: example.vietnamese_meaning,
      sortOrder: example.sort_order,
    });
  }

  for (const tagLink of (tagLinks ?? []) as Array<{
    word_id: string;
    word_tags: { slug: string } | Array<{ slug: string }> | null;
  }>) {
    const target = wordMap.get(tagLink.word_id);
    const slug = Array.isArray(tagLink.word_tags) ? tagLink.word_tags[0]?.slug : tagLink.word_tags?.slug;
    if (!target || !slug) {
      continue;
    }

    target.topicTags.push(slug);
  }

  for (const radicalLink of (radicalLinks ?? []) as Array<{
    word_id: string;
    radicals: { radical: string } | Array<{ radical: string }> | null;
  }>) {
    const target = wordMap.get(radicalLink.word_id);
    const radical = Array.isArray(radicalLink.radicals)
      ? radicalLink.radicals[0]?.radical
      : radicalLink.radicals?.radical;

    if (!target || !radical) {
      continue;
    }

    target.mainRadicals.push(radical);
  }

  return [...wordMap.values()].map((word) => ({
    ...word,
    topicTags: [...new Set(word.topicTags)],
    mainRadicals: [...new Set(word.mainRadicals)],
    examples: [...word.examples].sort((left, right) => left.sortOrder - right.sortOrder),
  }));
}
