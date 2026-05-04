import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEditorSenses,
  deriveLegacyWordSummaryFromSenses,
  parseAdminSensesJson,
} from "@/features/admin/word-senses";

test("parseAdminSensesJson enforces one primary sense and removes empty examples", () => {
  const senses = parseAdminSensesJson(
    JSON.stringify([
      {
        id: null,
        pinyin: "de",
        partOfSpeech: "tro_tu",
        meaningVi: "trợ từ kết cấu",
        usageNote: "dùng trong kết cấu",
        senseOrder: 9,
        isPrimary: true,
        isPublished: true,
        examples: [
          { chineseText: "说得对", pinyin: "shuō de duì", vietnameseMeaning: "nói đúng" },
          { chineseText: "", pinyin: "", vietnameseMeaning: "" },
        ],
      },
    ]),
  );

  assert.equal(senses.length, 1);
  assert.equal(senses[0]?.senseOrder, 1);
  assert.equal(senses[0]?.examples.length, 1);
});

test("parseAdminSensesJson rejects duplicate pinyin and part of speech", () => {
  assert.throws(
    () =>
      parseAdminSensesJson(
        JSON.stringify([
          {
            pinyin: "de",
            partOfSpeech: "tro_tu",
            meaningVi: "nghia 1",
            usageNote: null,
            senseOrder: 1,
            isPrimary: true,
            isPublished: true,
            examples: [],
          },
          {
            pinyin: "de",
            partOfSpeech: "tro_tu",
            meaningVi: "nghia 2",
            usageNote: null,
            senseOrder: 2,
            isPrimary: false,
            isPublished: true,
            examples: [],
          },
        ]),
      ),
    /Duplicate pinyin \+ part of speech combinations are not allowed\./,
  );
});

test("deriveLegacyWordSummaryFromSenses uses primary sense and unique summaries", () => {
  const summary = deriveLegacyWordSummaryFromSenses([
    {
      id: "1",
      pinyin: "de",
      partOfSpeech: "tro_tu",
      meaningVi: "trợ từ kết cấu",
      usageNote: null,
      senseOrder: 2,
      isPrimary: false,
      isPublished: true,
      examples: [],
    },
    {
      id: "2",
      pinyin: "děi",
      partOfSpeech: "dong_tu",
      meaningVi: "phải, cần phải",
      usageNote: null,
      senseOrder: 1,
      isPrimary: true,
      isPublished: true,
      examples: [],
    },
  ]);

  assert.deepEqual(summary, {
    pinyin: "děi",
    vietnameseMeaning: "phải, cần phải",
    meaningsVi: "phải, cần phải | trợ từ kết cấu",
    partOfSpeech: "dong_tu|tro_tu",
    readingCandidates: "děi | de",
  });
});

test("buildEditorSenses falls back to one legacy sense when none exist", () => {
  const senses = buildEditorSenses({
    word: {
      id: "word-1",
      pinyin: "de",
      part_of_speech: "tro_tu",
      vietnamese_meaning: "trợ từ",
      notes: "legacy note",
      is_published: false,
    },
    senses: [],
    examples: [
      {
        chineseText: "说得对",
        pinyin: "shuō de duì",
        vietnameseMeaning: "nói đúng",
        sortOrder: 1,
        senseId: null,
      },
    ],
  });

  assert.equal(senses.length, 1);
  assert.equal(senses[0]?.isPrimary, true);
  assert.equal(senses[0]?.examples[0]?.chineseText, "说得对");
});
