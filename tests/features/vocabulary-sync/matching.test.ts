import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyVocabSyncRow,
  resolveVocabSyncMatch,
  type ExistingWordPreviewSnapshot,
} from "@/features/vocabulary-sync/matching";
import { parseAndNormalizeVocabSyncRow } from "@/features/vocabulary-sync/normalize";

function createBaseWord(overrides: Partial<ExistingWordPreviewSnapshot> = {}): ExistingWordPreviewSnapshot {
  return {
    id: "word-1",
    slug: "da-dien-thoai-da-dienhuà",
    externalSource: "google_sheets",
    externalId: null,
    sourceRowKey: "打电话::dǎ diànhuà::dong_tu",
    contentHash: "existing-content-hash",
    lastSourceUpdatedAt: "2026-04-17T00:00:00.000Z",
    normalizedText: "打电话",
    simplified: "打电话",
    hanzi: "打电话",
    pinyin: "dǎ diànhuà",
    partOfSpeech: "dong_tu",
    meaningsVi: "gọi điện thoại",
    hanViet: "đả điện thoại",
    traditionalVariant: "打電話",
    hskLevel: 1,
    componentBreakdownJson: [{ character: "打", components: ["扌", "丁"] }],
    radicalSummary: "Bộ Thủ và bộ Ngôn.",
    mnemonic: "Dùng tay để gọi điện thoại.",
    characterStructureType: "khac",
    structureExplanation: "Từ ghép động từ và danh từ.",
    notes: "Động từ ly hợp.",
    ambiguityFlag: false,
    ambiguityNote: null,
    readingCandidates: "dǎ diànhuà|gọi điện thoại",
    reviewStatus: "pending",
    aiStatus: "done",
    sourceConfidence: "high",
    mainRadicals: ["扌", "电", "舌"],
    topicTags: ["giao_tiep", "cong_nghe", "pho_bien"],
    senses: [],
    examples: [
      {
        chineseText: "我在打电话。",
        pinyin: "Wǒ zài dǎ diànhuà.",
        vietnameseMeaning: "Tôi đang gọi điện thoại.",
        sortOrder: 1,
      },
    ],
    ...overrides,
  };
}

function createParsedRow(overrides: Record<string, string> = {}) {
  return parseAndNormalizeVocabSyncRow({
    rowNumber: 2,
    values: {
      normalized_text: "打电话",
      pinyin: "dǎ diànhuà",
      meanings_vi: "gọi điện thoại",
      han_viet: "đả điện thoại",
      traditional_variant: "打電話",
      main_radicals: "扌 | 电 | 舌",
      component_breakdown_json: '[{"character":"打","components":["扌","丁"]}]',
      radical_summary: "Bộ Thủ và bộ Ngôn.",
      hsk_level: "1",
      part_of_speech: "dong_tu",
      topic_tags: "giao_tiep | cong_nghe | pho_bien",
      examples: "CN=我在打电话。|PY=Wǒ zài dǎ diànhuà.|VI=Tôi đang gọi điện thoại.",
      character_structure_type: "khac",
      structure_explanation: "Từ ghép động từ và danh từ.",
      mnemonic: "Dùng tay để gọi điện thoại.",
      notes: "Động từ ly hợp.",
      source_confidence: "high",
      ambiguity_flag: "false",
      reading_candidates: "dǎ diànhuà|gọi điện thoại",
      review_status: "pending",
      ai_status: "done",
      ...overrides,
    },
  });
}

test("classifyVocabSyncRow returns unchanged for equivalent content", () => {
  const parsed = createParsedRow();
  const result = classifyVocabSyncRow(
    parsed,
    [
      createBaseWord({
        contentHash: parsed.contentHash,
        reviewStatus: "applied",
        aiStatus: "done",
      }),
    ],
  );

  assert.equal(result.changeClassification, "unchanged");
  assert.deepEqual(result.matchedWordIds, ["word-1"]);
  assert.equal(result.diffSummary?.matchedWordId, "word-1");
  assert.equal(result.diffSummary?.reason, "matching_content_hash");
});

test("classifyVocabSyncRow returns unchanged when source timestamp is not newer", () => {
  const parsed = createParsedRow({
    updated_at: "2026-04-16T00:00:00.000Z",
    notes: "Bản sheet cũ hơn nhưng nội dung đã thay đổi.",
  });
  const result = classifyVocabSyncRow(parsed, [
    createBaseWord({
      contentHash: "older-hash",
      lastSourceUpdatedAt: "2026-04-17T00:00:00.000Z",
    }),
  ]);

  assert.equal(result.changeClassification, "unchanged");
  assert.equal(result.diffSummary?.reason, "stale_source_timestamp");
});

test("classifyVocabSyncRow returns changed when content differs", () => {
  const parsed = createParsedRow({
    notes: "Ghi chú mới.",
  });
  const result = classifyVocabSyncRow(parsed, [createBaseWord({ contentHash: "different-hash" })]);

  assert.equal(result.changeClassification, "changed");
  assert.ok(result.diffSummary);
  assert.equal(result.diffSummary?.matchedWordSlug, "da-dien-thoai-da-dienhuà");
});

test("classifyVocabSyncRow returns conflict when multiple rows still match", () => {
  const parsed = createParsedRow({
    part_of_speech: "",
  });
  const result = classifyVocabSyncRow(parsed, [
    createBaseWord({ id: "word-1", sourceRowKey: null, partOfSpeech: null }),
    createBaseWord({ id: "word-2", sourceRowKey: null, pinyin: "dǎ diànhuà", partOfSpeech: null }),
  ]);

  assert.equal(result.changeClassification, "conflict");
  assert.equal(result.matchedWordIds.length, 2);
  assert.equal(result.diffSummary?.candidateCount, 2);
});

test("classifyVocabSyncRow returns invalid for parse errors", () => {
  const parsed = parseAndNormalizeVocabSyncRow({
    rowNumber: 4,
    values: {
      normalized_text: "",
      pinyin: "",
      meanings_vi: "",
    },
  });

  const result = classifyVocabSyncRow(parsed, [createBaseWord()]);
  assert.equal(result.changeClassification, "invalid");
});

test("resolveVocabSyncMatch prefers exact external_id over other candidates", () => {
  const parsed = createParsedRow({
    external_id: "sheet-row-2",
  });
  const result = resolveVocabSyncMatch(parsed, [
    createBaseWord({ id: "word-1", externalId: "sheet-row-2" }),
    createBaseWord({ id: "word-2", externalId: null, sourceRowKey: null }),
  ]);

  assert.equal(result.matchResult, "external_id");
  assert.deepEqual(result.candidates.map((candidate) => candidate.id), ["word-1"]);
});

test("resolveVocabSyncMatch narrows normalized text matches by pinyin", () => {
  const parsed = createParsedRow({
    external_id: "",
    part_of_speech: "",
  });
  const result = resolveVocabSyncMatch(parsed, [
    createBaseWord({ id: "word-1", externalId: null, sourceRowKey: null, pinyin: "dǎ diànhuà" }),
    createBaseWord({ id: "word-2", externalId: null, sourceRowKey: null, pinyin: "diǎn huà" }),
  ]);

  assert.equal(result.matchResult, "normalized_text");
  assert.deepEqual(result.candidates.map((candidate) => candidate.id), ["word-1"]);
});
