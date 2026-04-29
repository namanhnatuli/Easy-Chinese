import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPracticeProgressPatch,
  selectReadingPracticeItems,
  splitWordIntoHanziCharacters,
} from "@/features/practice/helpers";

test("splitWordIntoHanziCharacters keeps only Hanzi characters", () => {
  assert.deepEqual(splitWordIntoHanziCharacters("你好！abc"), ["你", "好"]);
  assert.deepEqual(splitWordIntoHanziCharacters("学习中文"), ["学", "习", "中", "文"]);
});

test("buildPracticeProgressPatch moves skipped items into practicing unless already completed", () => {
  const patch = buildPracticeProgressPatch(
    {
      id: "progress-1",
      status: "new",
      attemptCount: 1,
      lastPracticedAt: null,
    },
    "skipped",
    new Date("2026-04-29T10:00:00Z"),
  );

  assert.equal(patch.status, "practicing");
  assert.equal(patch.attempt_count, 2);
});

test("selectReadingPracticeItems prioritizes difficult and least recently practiced items", () => {
  const items = selectReadingPracticeItems(
    [
      {
        kind: "word",
        id: "word-1",
        slug: "ni-hao",
        hanzi: "你好",
        simplified: "你好",
        pinyin: "ni hao",
        vietnameseMeaning: "xin chao",
        hskLevel: 1,
        memory: null,
        progress: {
          id: "p1",
          status: "completed",
          attemptCount: 2,
          lastPracticedAt: "2026-04-28T08:00:00Z",
        },
      },
      {
        kind: "word",
        id: "word-2",
        slug: "xue-xi",
        hanzi: "学习",
        simplified: "学习",
        pinyin: "xue xi",
        vietnameseMeaning: "hoc",
        hskLevel: 1,
        memory: null,
        progress: {
          id: "p2",
          status: "difficult",
          attemptCount: 1,
          lastPracticedAt: "2026-04-29T08:00:00Z",
        },
      },
      {
        kind: "word",
        id: "word-3",
        slug: "zhong-wen",
        hanzi: "中文",
        simplified: "中文",
        pinyin: "zhong wen",
        vietnameseMeaning: "tieng trung",
        hskLevel: 1,
        memory: null,
        progress: null,
      },
    ],
    3,
  );

  assert.equal(items[0]?.id, "word-2");
  assert.equal(items[1]?.id, "word-3");
  assert.equal(items[2]?.id, "word-1");
});
