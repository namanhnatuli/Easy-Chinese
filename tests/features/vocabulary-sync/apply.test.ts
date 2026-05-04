import test from "node:test";
import assert from "node:assert/strict";

import { resolveEffectiveInputTextForApply } from "@/features/vocabulary-sync/apply-payload";
import {
  buildSenseSourceKeyForApply,
  buildSenseContentHashForApply,
  resolveApplySenses,
} from "@/features/vocabulary-sync/apply-senses";

test("resolveEffectiveInputTextForApply falls back to normalizedText when inputText is missing", () => {
  assert.equal(
    resolveEffectiveInputTextForApply({
      inputText: null,
      normalizedText: "你好",
    }),
    "你好",
  );
});

test("resolveEffectiveInputTextForApply prefers inputText when provided", () => {
  assert.equal(
    resolveEffectiveInputTextForApply({
      inputText: "妳好",
      normalizedText: "你好",
    }),
    "妳好",
  );
});

test("resolveApplySenses falls back to a single default sense for legacy payloads", () => {
  const senses = resolveApplySenses({
    externalId: null,
    inputText: "得",
    normalizedText: "得",
    pinyin: "de",
    meaningsVi: "được",
    hanViet: null,
    traditionalVariant: null,
    mainRadicals: [],
    componentBreakdownJson: null,
    radicalSummary: null,
    hskLevel: null,
    partOfSpeech: "tro_tu",
    topicTags: [],
    examples: [
      {
        chineseText: "跑得快",
        pinyin: "pǎo de kuài",
        vietnameseMeaning: "chạy nhanh",
        sortOrder: 1,
      },
    ],
    similarChars: [],
    characterStructureType: null,
    structureExplanation: null,
    mnemonic: null,
    notes: "legacy note",
    sourceConfidence: null,
    ambiguityFlag: false,
    ambiguityNote: null,
    readingCandidates: "de|được",
    senses: [],
    senseSourceKeys: [],
    senseContentHashes: [],
    reviewStatus: "approved",
    aiStatus: "done",
    sourceUpdatedAt: null,
  });

  assert.equal(senses.length, 1);
  assert.equal(senses[0]?.pinyin, "de");
  assert.equal(senses[0]?.isPrimary, true);
  assert.equal(senses[0]?.usageNote, "legacy note");
  assert.equal(senses[0]?.examples[0]?.cn, "跑得快");
  assert.equal(senses[0]?.sourceKey, "得::de::tro_tu");
});

test("sense key and hash generation are deterministic for apply-time upserts", () => {
  const sourceKey = buildSenseSourceKeyForApply({
    normalizedText: "得",
    pinyin: "děi",
    partOfSpeech: "dong_tu",
  });
  const hashA = buildSenseContentHashForApply({
    pinyin: "děi",
    partOfSpeech: "dong_tu",
    meaningVi: "phải",
    usageNote: null,
    senseOrder: 1,
    isPrimary: true,
    examples: [{ cn: "我得走了。", py: "Wǒ děi zǒu le.", vi: "Tôi phải đi rồi." }],
  });
  const hashB = buildSenseContentHashForApply({
    pinyin: "děi",
    partOfSpeech: "dong_tu",
    meaningVi: "phải",
    usageNote: null,
    senseOrder: 1,
    isPrimary: true,
    examples: [{ cn: "我得走了。", py: "Wǒ děi zǒu le.", vi: "Tôi phải đi rồi." }],
  });

  assert.equal(sourceKey, "得::děi::dong_tu");
  assert.equal(hashA, hashB);
});
