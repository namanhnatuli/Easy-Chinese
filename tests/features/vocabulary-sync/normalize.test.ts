import assert from "node:assert/strict";
import test from "node:test";

import { parseAndNormalizeVocabSyncRow } from "@/features/vocabulary-sync/normalize";

test("parseAndNormalizeVocabSyncRow normalizes sheet payloads", () => {
  const row = parseAndNormalizeVocabSyncRow({
    rowNumber: 2,
    values: {
      input_text: " 打电话 ",
      normalized_text: "打电话",
      pinyin: " dǎ diànhuà ",
      meanings_vi: " gọi điện thoại ",
      han_viet: "đả điện thoại",
      traditional_variant: "打電話",
      main_radicals: "扌 | 电 | 舌",
      component_breakdown_json:
        '[{"character":"打","components":["扌","丁"]},{"character":"话","components":["讠","舌"]}]',
      radical_summary: "Bộ Thủ và bộ Ngôn.",
      hsk_level: "1",
      part_of_speech: " DONG_TU ",
      topic_tags: "giao_tiep | cong_nghe | pho_bien",
      examples:
        "CN=我在打电话。|PY=Wǒ zài dǎ diànhuà.|VI=Tôi đang gọi điện thoại. || CN=请给我打电话。|PY=Qǐng gěi wǒ dǎ diànhuà.|VI=Hãy gọi cho tôi.",
      similar_chars: "打 | 挂",
      character_structure_type: " KHAC ",
      structure_explanation: "Từ ghép động từ và danh từ.",
      mnemonic: "Dùng tay để gọi điện thoại.",
      notes: "Động từ ly hợp.",
      source_confidence: "HIGH",
      ambiguity_flag: "FALSE",
      ambiguity_note: "",
      reading_candidates: "dǎ diànhuà|gọi điện thoại",
      review_status: "pending",
      ai_status: "done",
      updated_at: "18/04/2026 7:31:16",
    },
  });

  assert.equal(row.parseErrors.length, 0);
  assert.equal(row.sourceRowKey, "打电话::dǎ diànhuà::dong_tu");
  assert.equal(row.normalizedPayload.partOfSpeech, "dong_tu");
  assert.deepEqual(row.normalizedPayload.mainRadicals, ["扌", "电", "舌"]);
  assert.equal(row.normalizedPayload.examples.length, 2);
  assert.equal(row.normalizedPayload.sourceUpdatedAt, "2026-04-18T07:31:16.000Z");
  assert.ok(row.contentHash);
});

test("parseAndNormalizeVocabSyncRow derives source_row_key from text, pinyin, and part of speech even with external_id", () => {
  const row = parseAndNormalizeVocabSyncRow({
    rowNumber: 4,
    values: {
      external_id: "sheet-row-4",
      normalized_text: "看",
      pinyin: "kàn",
      meanings_vi: "nhìn",
      part_of_speech: "dong_tu",
    },
  });

  assert.equal(row.parseErrors.length, 0);
  assert.equal(row.sourceRowKey, "看::kàn::dong_tu");
});

test("parseAndNormalizeVocabSyncRow records parse errors for invalid payloads", () => {
  const row = parseAndNormalizeVocabSyncRow({
    rowNumber: 3,
    values: {
      normalized_text: "",
      pinyin: "",
      meanings_vi: "",
      component_breakdown_json: "{bad json}",
      hsk_level: "20",
      source_confidence: "certain",
      review_status: "queued",
      ai_status: "later",
      updated_at: "not-a-date",
    },
  });

  assert.equal(row.contentHash, null);
  assert.ok(row.parseErrors.some((error) => error.includes("normalized_text is required")));
  assert.ok(row.parseErrors.some((error) => error.includes("Invalid component_breakdown_json JSON")));
  assert.ok(row.parseErrors.some((error) => error.includes("Invalid hsk_level")));
});
