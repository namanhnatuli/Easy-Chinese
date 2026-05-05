import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAndNormalizeGrammarSyncRow,
  parseGrammarExamplesStructured,
} from "@/features/grammar-sync/normalize";

test("parseAndNormalizeGrammarSyncRow uses authoritative grammar columns", () => {
  const row = parseAndNormalizeGrammarSyncRow({
    rowNumber: 2,
    values: {
      "điểm_ngữ_pháp": "Đại từ nghi vấn “什么/shénme/”",
      "giải_thích": "Legacy explanation",
      "ví_dụ": "Legacy example",
      hsk: "1",
      title: " Đại từ nghi vấn 什么 (shénme) ",
      slug: " dai-tu-nghi-van-shenme ",
      structure_text: " 什么 + danh từ / động từ + 什么 ",
      explanation_vi: " Đại từ nghi vấn '什么' dùng để hỏi... ",
      notes: " Có thể đứng độc lập hoặc kết hợp trước danh từ. ",
      examples_structured:
        "CN=你叫什么名字？|PY=Nǐ jiào shénme míngzi?|VI=Tên bạn là gì? || CN=你买什么？|PY=Nǐ mǎi shénme?|VI=Bạn mua gì?",
      hsk_level: "1",
      source_confidence: "HIGH",
      ambiguity_flag: "FALSE",
      ambiguity_note: "",
      review_status: "approved",
      ai_status: "done",
      updated_at: "04/05/2026 21:37:01",
    },
  });

  assert.equal(row.parseErrors.length, 0);
  assert.equal(row.sourceRowKey, "dai-tu-nghi-van-shenme");
  assert.equal(row.normalizedPayload.title, "Đại từ nghi vấn 什么 (shénme)");
  assert.equal(row.normalizedPayload.structureText, "什么 + danh từ / động từ + 什么");
  assert.equal(row.normalizedPayload.hskLevel, 1);
  assert.equal(row.normalizedPayload.sourceConfidence, "high");
  assert.equal(row.normalizedPayload.ambiguityFlag, false);
  assert.equal(row.normalizedPayload.reviewStatus, "approved");
  assert.equal(row.normalizedPayload.aiStatus, "done");
  assert.equal(row.normalizedPayload.examples.length, 2);
  assert.equal(row.normalizedPayload.examples[0]?.chineseText, "你叫什么名字？");
  assert.equal(row.normalizedPayload.sourceUpdatedAt, "2026-05-04T21:37:01.000Z");
  assert.ok(row.contentHash);
});

test("parseGrammarExamplesStructured accepts CN with optional PY and VI", () => {
  const result = parseGrammarExamplesStructured("CN=你买什么？|PY=Nǐ mǎi shénme? || CN=什么？|VI=Cái gì?");

  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.examples.map((example) => ({
      chineseText: example.chineseText,
      pinyin: example.pinyin,
      vietnameseMeaning: example.vietnameseMeaning,
      sortOrder: example.sortOrder,
    })),
    [
      {
        chineseText: "你买什么？",
        pinyin: "Nǐ mǎi shénme?",
        vietnameseMeaning: null,
        sortOrder: 1,
      },
      {
        chineseText: "什么？",
        pinyin: null,
        vietnameseMeaning: "Cái gì?",
        sortOrder: 2,
      },
    ],
  );
});

test("parseAndNormalizeGrammarSyncRow marks invalid rows clearly", () => {
  const row = parseAndNormalizeGrammarSyncRow({
    rowNumber: 3,
    values: {
      title: "",
      slug: "",
      structure_text: "",
      explanation_vi: "",
      hsk_level: "10",
      examples_structured: "PY=Nǐ hǎo|VI=Xin chào",
      updated_at: "not a date",
    },
  });

  assert.equal(row.initialChangeClassification, "invalid");
  assert.ok(row.parseErrors.includes("title is required."));
  assert.ok(row.parseErrors.includes("slug is required."));
  assert.ok(row.parseErrors.includes("structure_text is required."));
  assert.ok(row.parseErrors.includes("explanation_vi is required."));
  assert.ok(row.parseErrors.includes("hsk_level must be an integer from 1 to 9."));
  assert.ok(row.parseErrors.includes("Example 1: CN is required."));
  assert.ok(row.parseErrors.includes("updated_at must be a valid date or timestamp."));
});
