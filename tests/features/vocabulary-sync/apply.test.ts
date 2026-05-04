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
    senseSourceMode: "legacy",
    validationWarnings: [],
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

test("resolveApplySenses uses sense examples instead of flattened legacy examples when senses exist", () => {
  const senses = resolveApplySenses({
    externalId: null,
    inputText: "次",
    normalizedText: "次",
    pinyin: "cì",
    meaningsVi: "lần | thứ",
    hanViet: null,
    traditionalVariant: null,
    mainRadicals: [],
    componentBreakdownJson: null,
    radicalSummary: null,
    hskLevel: null,
    partOfSpeech: "danh_tu | tinh_tu",
    topicTags: [],
    examples: [
      {
        chineseText: "旧例句。",
        pinyin: "Jiù lìjù.",
        vietnameseMeaning: "Ví dụ cũ.",
        sortOrder: 1,
      },
    ],
    similarChars: [],
    characterStructureType: null,
    structureExplanation: null,
    mnemonic: null,
    notes: null,
    sourceConfidence: null,
    ambiguityFlag: false,
    ambiguityNote: null,
    readingCandidates: "cì=lần || cì=thứ",
    senses: [
      {
        pinyin: "cì",
        partOfSpeech: "danh_tu",
        meaningVi: "lần",
        usageNote: null,
        senseOrder: 1,
        isPrimary: true,
        examples: [{ cn: "这是第几次了？", py: "Zhè shì dì jǐ cì le?", vi: "Đây là lần thứ mấy rồi?" }],
      },
      {
        pinyin: "cì",
        partOfSpeech: "tinh_tu",
        meaningVi: "thứ",
        usageNote: null,
        senseOrder: 2,
        isPrimary: false,
        examples: [{ cn: "下次一定成功。", py: "Xià cì yīdìng chénggōng.", vi: "Lần sau nhất định sẽ thành công." }],
      },
    ],
    senseSourceKeys: ["次::cì::danh_tu::lần", "次::cì::tinh_tu::thứ"],
    senseContentHashes: ["hash-1", "hash-2"],
    senseSourceMode: "senses_json",
    validationWarnings: [],
    reviewStatus: "approved",
    aiStatus: "done",
    sourceUpdatedAt: null,
  });

  assert.equal(senses.length, 2);
  assert.deepEqual(senses.map((sense) => sense.examples.map((example) => example.cn)), [
    ["这是第几次了？"],
    ["下次一定成功。"],
  ]);
  assert.ok(!senses.some((sense) => sense.examples.some((example) => example.cn === "旧例句。")));
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
