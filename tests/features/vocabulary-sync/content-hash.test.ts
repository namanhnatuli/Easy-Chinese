import test from "node:test";
import assert from "node:assert/strict";

import { buildWordContentHash, stableStringify } from "@/features/vocabulary-sync/content-hash";

test("stableStringify sorts object keys recursively", () => {
  const left = stableStringify({
    pinyin: "dà",
    nested: {
      z: 2,
      a: 1,
    },
  });

  const right = stableStringify({
    nested: {
      a: 1,
      z: 2,
    },
    pinyin: "dà",
  });

  assert.equal(left, right);
});

test("buildWordContentHash is stable for equivalent payloads", () => {
  const left = buildWordContentHash({
    normalizedText: "打电话",
    pinyin: "dǎ diànhuà",
    meaningsVi: "gọi điện thoại",
    hanViet: "đả điện thoại",
    traditionalVariant: "打電話",
    hskLevel: 1,
    partOfSpeech: "dong_tu",
    componentBreakdownJson: [
      { character: "打", components: ["扌", "丁"] },
      { character: "话", components: ["讠", "舌"] },
    ],
    radicalSummary: "Bộ Thủ và bộ Ngôn.",
    mnemonic: "Dùng tay để gọi điện thoại.",
    characterStructureType: "khac",
    structureExplanation: "Từ ghép động từ và danh từ.",
    notes: "Động từ ly hợp.",
    ambiguityFlag: false,
    ambiguityNote: null,
    readingCandidates: null,
  });

  const right = buildWordContentHash({
    normalizedText: "打电话",
    pinyin: "dǎ diànhuà",
    meaningsVi: "gọi điện thoại",
    hanViet: "đả điện thoại",
    traditionalVariant: "打電話",
    hskLevel: 1,
    partOfSpeech: "dong_tu",
    componentBreakdownJson: [
      { components: ["扌", "丁"], character: "打" },
      { components: ["讠", "舌"], character: "话" },
    ],
    radicalSummary: "Bộ Thủ và bộ Ngôn.",
    mnemonic: "Dùng tay để gọi điện thoại.",
    characterStructureType: "khac",
    structureExplanation: "Từ ghép động từ và danh từ.",
    notes: "Động từ ly hợp.",
    ambiguityFlag: false,
    ambiguityNote: null,
    readingCandidates: null,
  });

  assert.equal(left, right);
});
