import assert from "node:assert/strict";
import test from "node:test";

import { classifyGrammarSyncRow } from "@/features/grammar-sync/matching";
import { parseAndNormalizeGrammarSyncRow } from "@/features/grammar-sync/normalize";
import type { ExistingGrammarSnapshot } from "@/features/grammar-sync/types";

function createParsedRow(overrides: Record<string, string> = {}) {
  return parseAndNormalizeGrammarSyncRow({
    rowNumber: 2,
    values: {
      title: "Đại từ nghi vấn 什么 (shénme)",
      slug: "dai-tu-nghi-van-shenme",
      structure_text: "什么 + danh từ / động từ + 什么",
      explanation_vi: "Đại từ nghi vấn '什么' dùng để hỏi.",
      notes: "Có thể đứng độc lập.",
      examples_structured: "CN=你买什么？|PY=Nǐ mǎi shénme?|VI=Bạn mua gì?",
      hsk_level: "1",
      source_confidence: "high",
      ambiguity_flag: "false",
      review_status: "approved",
      ai_status: "done",
      ...overrides,
    },
  });
}

function createExistingGrammar(overrides: Partial<ExistingGrammarSnapshot> = {}): ExistingGrammarSnapshot {
  return {
    id: "grammar-1",
    title: "Đại từ nghi vấn 什么 (shénme)",
    slug: "dai-tu-nghi-van-shenme",
    structureText: "什么 + danh từ / động từ + 什么",
    explanationVi: "Đại từ nghi vấn '什么' dùng để hỏi.",
    notes: "Có thể đứng độc lập.",
    examples: [
      {
        chineseText: "你买什么？",
        pinyin: "Nǐ mǎi shénme?",
        vietnameseMeaning: "Bạn mua gì?",
        sortOrder: 1,
      },
    ],
    hskLevel: 1,
    sourceConfidence: "high",
    ambiguityFlag: false,
    ambiguityNote: null,
    reviewStatus: "approved",
    aiStatus: "done",
    sourceRowKey: "dai-tu-nghi-van-shenme",
    contentHash: "existing-hash",
    lastSourceUpdatedAt: null,
    ...overrides,
  };
}

test("classifyGrammarSyncRow returns unchanged for matching content hash", () => {
  const parsed = createParsedRow();
  const result = classifyGrammarSyncRow(parsed, [
    createExistingGrammar({
      contentHash: parsed.contentHash,
    }),
  ]);

  assert.equal(result.changeClassification, "unchanged");
  assert.equal(result.matchResult, "slug");
  assert.deepEqual(result.matchedGrammarIds, ["grammar-1"]);
});

test("classifyGrammarSyncRow returns changed when content hash differs", () => {
  const parsed = createParsedRow({
    notes: "Ghi chú mới.",
  });
  const result = classifyGrammarSyncRow(parsed, [createExistingGrammar()]);

  assert.equal(result.changeClassification, "changed");
  assert.equal(result.matchResult, "slug");
  assert.deepEqual(result.diffSummary?.changedFields, ["notes"]);
});

test("classifyGrammarSyncRow returns conflict for duplicate slug matches", () => {
  const parsed = createParsedRow();
  const result = classifyGrammarSyncRow(parsed, [
    createExistingGrammar({ id: "grammar-1" }),
    createExistingGrammar({ id: "grammar-2" }),
  ]);

  assert.equal(result.changeClassification, "conflict");
  assert.equal(result.matchResult, "conflict");
  assert.deepEqual(result.matchedGrammarIds, ["grammar-1", "grammar-2"]);
});

test("classifyGrammarSyncRow returns invalid when parser reports errors", () => {
  const parsed = parseAndNormalizeGrammarSyncRow({
    rowNumber: 4,
    values: {
      title: "",
      slug: "",
      structure_text: "",
      explanation_vi: "",
      hsk_level: "",
    },
  });
  const result = classifyGrammarSyncRow(parsed, [createExistingGrammar()]);

  assert.equal(result.changeClassification, "invalid");
  assert.equal(result.matchResult, "none");
  assert.ok(result.errorMessage?.includes("title is required."));
});
