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
  assert.equal(row.normalizedPayload.senses.length, 1);
  assert.equal(row.normalizedPayload.senses[0]?.isPrimary, true);
  assert.equal(row.normalizedPayload.sourceUpdatedAt, "2026-04-18T07:31:16.000Z");
  assert.ok(row.contentHash);
});

test("parseAndNormalizeVocabSyncRow uses senses_json when provided", () => {
  const row = parseAndNormalizeVocabSyncRow({
    rowNumber: 5,
    values: {
      normalized_text: "得",
      pinyin: "de",
      meanings_vi: "được",
      part_of_speech: "tro_tu",
      senses_json: JSON.stringify({
        senses: [
          {
            pinyin: "de",
            meaning_vi: "trợ từ kết cấu",
            part_of_speech: "tro_tu",
            usage_note: "Dùng rất thường xuyên.",
            sense_order: 2,
            is_primary: false,
            examples: [
              {
                cn: "跑得快",
                py: "pǎo de kuài",
                vi: "chạy nhanh",
              },
            ],
          },
          {
            pinyin: "děi",
            meaning_vi: "phải, cần phải",
            part_of_speech: "dong_tu",
            sense_order: 1,
            is_primary: true,
            examples: [
              {
                chineseText: "我得走了。",
                pinyin: "Wǒ děi zǒu le.",
                vietnameseMeaning: "Tôi phải đi rồi.",
              },
            ],
          },
          {},
        ],
      }),
    },
  });

  assert.equal(row.parseErrors.length, 0);
  assert.equal(row.normalizedPayload.senses.length, 2);
  assert.equal(row.normalizedPayload.pinyin, "děi");
  assert.equal(row.normalizedPayload.meaningsVi, "phải, cần phải | trợ từ kết cấu");
  assert.equal(row.normalizedPayload.partOfSpeech, "dong_tu | tro_tu");
  assert.equal(row.normalizedPayload.readingCandidates, "děi=phải, cần phải || de=trợ từ kết cấu");
  assert.deepEqual(row.normalizedPayload.examples.map((example) => example.chineseText), ["我得走了。", "跑得快"]);
  assert.equal(row.normalizedPayload.senseSourceKeys.length, 2);
  assert.equal(row.normalizedPayload.senseSourceMode, "senses_json");
  assert.equal(row.sourceRowKey, "得::děi::dong_tu | tro_tu");
});

test("parseAndNormalizeVocabSyncRow ignores multi-value legacy part_of_speech when senses_json is valid", () => {
  const row = parseAndNormalizeVocabSyncRow({
    rowNumber: 8,
    values: {
      normalized_text: "次",
      pinyin: "legacy pinyin",
      meanings_vi: "legacy meaning",
      part_of_speech: "luong_tu | tinh_tu",
      examples: "CN=旧例句。|PY=Jiù lìjù.|VI=Ví dụ cũ.",
      senses_json: JSON.stringify([
        {
          pinyin: "cì",
          part_of_speech: "danh_tu",
          meaning_vi: "lần (chỉ thứ tự, số lần)",
          examples: [{ cn: "这是第几次了？", py: "Zhè shì dì jǐ cì le?", vi: "Đây là lần thứ mấy rồi?" }],
          sense_order: 1,
        },
        {
          pinyin: "cì",
          part_of_speech: "tinh_tu",
          meaning_vi: "thứ, kế tiếp",
          examples: [{ cn: "下次一定成功。", py: "Xià cì yīdìng chénggōng.", vi: "Lần sau nhất định sẽ thành công." }],
          sense_order: 2,
        },
      ]),
    },
  });

  assert.equal(row.parseErrors.length, 0);
  assert.equal(row.initialChangeClassification, "new");
  assert.equal(row.normalizedPayload.senses.length, 2);
  assert.equal(row.normalizedPayload.pinyin, "cì");
  assert.equal(row.normalizedPayload.meaningsVi, "lần (chỉ thứ tự, số lần) | thứ, kế tiếp");
  assert.equal(row.normalizedPayload.partOfSpeech, "danh_tu | tinh_tu");
  assert.deepEqual(row.normalizedPayload.examples.map((example) => example.chineseText), ["这是第几次了?", "下次一定成功。"]);
  assert.ok(!row.normalizedPayload.examples.some((example) => example.chineseText === "旧例句。"));
});

test("parseAndNormalizeVocabSyncRow keeps valid senses when another sense has invalid part_of_speech", () => {
  const row = parseAndNormalizeVocabSyncRow({
    rowNumber: 9,
    values: {
      normalized_text: "行",
      senses_json: JSON.stringify([
        {
          pinyin: "xíng",
          part_of_speech: "dong_tu",
          meaning_vi: "được, ổn",
        },
        {
          pinyin: "háng",
          part_of_speech: "bad_pos",
          meaning_vi: "hàng, ngành",
        },
      ]),
    },
  });

  assert.equal(row.parseErrors.length, 0);
  assert.equal(row.normalizedPayload.senses.length, 1);
  assert.equal(row.normalizedPayload.senses[0]?.pinyin, "xíng");
  assert.ok(row.normalizedPayload.validationWarnings.some((warning) => warning.includes("Invalid sense 2")));
  assert.equal(row.initialChangeClassification, "new");
});

test("parseAndNormalizeVocabSyncRow marks row invalid when senses_json has no valid senses", () => {
  const row = parseAndNormalizeVocabSyncRow({
    rowNumber: 10,
    values: {
      normalized_text: "行",
      senses_json: JSON.stringify([
        {
          pinyin: "háng",
          part_of_speech: "bad_pos",
          meaning_vi: "hàng, ngành",
        },
      ]),
    },
  });

  assert.equal(row.initialChangeClassification, "invalid");
  assert.ok(row.parseErrors.some((error) => error.includes("does not contain any valid senses")));
  assert.equal(row.normalizedPayload.senses.length, 0);
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

test("parseAndNormalizeVocabSyncRow falls back to one default sense when senses_json is empty", () => {
  const row = parseAndNormalizeVocabSyncRow({
    rowNumber: 6,
    values: {
      normalized_text: "看",
      pinyin: "kàn",
      meanings_vi: "nhìn",
      part_of_speech: "dong_tu",
      notes: "Nghĩa cơ bản.",
      examples: "CN=我看书。|PY=Wǒ kàn shū.|VI=Tôi đọc sách.",
      senses_json: "",
    },
  });

  assert.equal(row.parseErrors.length, 0);
  assert.equal(row.normalizedPayload.senses.length, 1);
  assert.equal(row.normalizedPayload.senses[0]?.meaningVi, "nhìn");
  assert.equal(row.normalizedPayload.senses[0]?.usageNote, "Nghĩa cơ bản.");
  assert.equal(row.normalizedPayload.senses[0]?.examples[0]?.cn, "我看书。");
  assert.equal(row.normalizedPayload.examples[0]?.vietnameseMeaning, "Tôi đọc sách.");
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

test("parseAndNormalizeVocabSyncRow marks invalid senses_json and falls back to default sense", () => {
  const row = parseAndNormalizeVocabSyncRow({
    rowNumber: 7,
    values: {
      normalized_text: "得",
      pinyin: "de",
      meanings_vi: "được",
      part_of_speech: "tro_tu",
      senses_json: "{bad json}",
    },
  });

  assert.equal(row.initialChangeClassification, "invalid");
  assert.ok(row.parseErrors.some((error) => error.includes("Invalid senses_json JSON")));
  assert.equal(row.normalizedPayload.senses.length, 1);
  assert.equal(row.normalizedPayload.senses[0]?.pinyin, "de");
});
