import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLessonGeneratorPreview,
  scoreWordDifficulty,
  type LessonGeneratorWord,
} from "@/features/admin/lesson-generator-core";

function createWord(overrides: Partial<LessonGeneratorWord>): LessonGeneratorWord {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    slug: overrides.slug ?? "word",
    hanzi: overrides.hanzi ?? "词",
    pinyin: overrides.pinyin ?? "cí",
    vietnameseMeaning: overrides.vietnameseMeaning ?? "từ",
    normalizedText: overrides.normalizedText ?? "词",
    meaningsVi: overrides.meaningsVi ?? "từ",
    hskLevel: overrides.hskLevel ?? 3,
    partOfSpeech: overrides.partOfSpeech ?? "noun",
    componentBreakdownJson: overrides.componentBreakdownJson ?? [{ character: "词", components: ["讠", "司"] }],
    ambiguityFlag: overrides.ambiguityFlag ?? false,
    sourceConfidence: overrides.sourceConfidence ?? "high",
    reviewStatus: overrides.reviewStatus ?? "approved",
    isPublished: overrides.isPublished ?? true,
    tagSlugs: overrides.tagSlugs ?? ["daily-life"],
    radicalTokens: overrides.radicalTokens ?? ["讠"],
    componentTokens: overrides.componentTokens ?? ["讠", "司"],
    lessonMemberships: overrides.lessonMemberships ?? [],
  };
}

test("difficulty scoring ranks simpler approved words as easier", () => {
  const easier = createWord({
    slug: "ni",
    hanzi: "你",
    pinyin: "nǐ",
    hskLevel: 1,
    meaningsVi: "bạn",
    componentBreakdownJson: [{ character: "你", components: ["亻", "尔"] }],
    ambiguityFlag: false,
    sourceConfidence: "high",
  });
  const harder = createWord({
    slug: "renwei",
    hanzi: "认为",
    pinyin: "rènwéi",
    hskLevel: 4,
    meaningsVi: "cho rằng; nhận định; xem là",
    componentBreakdownJson: [
      { character: "认", components: ["讠", "人"] },
      { character: "为", components: ["丶", "力"] },
      { character: "扩", components: ["广"] },
    ],
    ambiguityFlag: true,
    sourceConfidence: "low",
  });

  assert.ok(scoreWordDifficulty(easier) < scoreWordDifficulty(harder));
});

test("lesson preview prefers unused matching-tag words when reuse is disabled", () => {
  const selected = buildLessonGeneratorPreview(
    [
      createWord({
        id: "00000000-0000-0000-0000-000000000001",
        slug: "jia",
        hanzi: "家",
        pinyin: "jiā",
        hskLevel: 1,
        tagSlugs: ["family"],
        lessonMemberships: [],
      }),
      createWord({
        id: "00000000-0000-0000-0000-000000000002",
        slug: "baba",
        hanzi: "爸爸",
        pinyin: "bàba",
        hskLevel: 1,
        tagSlugs: ["family"],
        lessonMemberships: [],
      }),
      createWord({
        id: "00000000-0000-0000-0000-000000000003",
        slug: "mama",
        hanzi: "妈妈",
        pinyin: "māma",
        hskLevel: 1,
        tagSlugs: ["family"],
        lessonMemberships: [
          {
            lessonId: "lesson-1",
            lessonTitle: "Existing family lesson",
            lessonSlug: "existing-family-lesson",
            isPublished: false,
          },
        ],
      }),
    ],
    {
      hskLevel: 1,
      topicTagSlugs: ["family"],
      targetWordCount: 2,
      excludePublishedLessonWords: true,
      includeUnapprovedWords: false,
      allowReusedWords: false,
    },
  );

  assert.equal(selected.selectedWords.length, 2);
  assert.deepEqual(
    selected.selectedWords.map((word) => word.wordId),
    [
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
    ],
  );
  assert.match(selected.selectedWords[0].selectionReason, /selected topic tag|seed word/i);
});

