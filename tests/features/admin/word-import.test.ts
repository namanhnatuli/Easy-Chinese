import assert from "node:assert/strict";
import test from "node:test";

import { detectImportedWordDuplicates, parseWordImportText } from "@/features/admin/word-import-parser";

test("word import parser supports CSV rows with optional examples_json", () => {
  const csv = [
    "slug,simplified,hanzi,pinyin,vietnamese_meaning,hsk_level,examples_json",
    "\"ni-hao\",你好,你好,nǐ hǎo,xin chào,1,\"[{\"\"chineseText\"\":\"\"你好！\"\",\"\"vietnameseMeaning\"\":\"\"Xin chào!\"\"}]\"",
  ].join("\n");

  const parsed = parseWordImportText("words.csv", csv);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].slug, "ni-hao");
  assert.equal(parsed[0].examples.length, 1);
});

test("word import parser supports JSON and detects duplicate rows", () => {
  const json = JSON.stringify([
    {
      slug: "ni-hao",
      simplified: "你好",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      vietnamese_meaning: "xin chào",
      hsk_level: 1,
    },
    {
      slug: "ni-hao",
      simplified: "你好",
      hanzi: "你好",
      pinyin: "nǐ hǎo",
      vietnamese_meaning: "xin chào",
      hsk_level: 1,
    },
  ]);

  const parsed = parseWordImportText("words.json", json);
  const duplicates = detectImportedWordDuplicates(parsed);

  assert.equal(parsed.length, 2);
  assert.equal(duplicates.length, 2);
});
