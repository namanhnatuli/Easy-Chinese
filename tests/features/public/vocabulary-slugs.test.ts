import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLegacyPinyinSlug,
  buildUniqueWordSlug,
  buildVocabularyDetailPath,
  buildWordSlugBase,
} from "@/features/public/vocabulary-slugs";

test("word slug generation prefers normalized Hanzi text", () => {
  assert.equal(
    buildWordSlugBase({
      normalizedText: "的",
      hanzi: "得",
      simplified: "地",
    }),
    "的",
  );
});

test("word slug generation supports multi-character Hanzi words", () => {
  assert.equal(
    buildWordSlugBase({
      normalizedText: "打电话",
      hanzi: "打电话",
      simplified: "打电话",
    }),
    "打电话",
  );
});

test("word slug generation falls back from normalized text to hanzi and simplified", () => {
  assert.equal(buildWordSlugBase({ normalizedText: null, hanzi: "得", simplified: "地" }), "得");
  assert.equal(buildWordSlugBase({ normalizedText: "", hanzi: "", simplified: "地" }), "地");
});

test("unique word slug appends numeric suffixes for duplicate Hanzi", () => {
  assert.equal(
    buildUniqueWordSlug(
      {
        normalizedText: "行",
        hanzi: "行",
        simplified: "行",
      },
      ["行", "行-2"],
    ),
    "行-3",
  );
});

test("legacy pinyin slug normalization strips tones for temporary redirects", () => {
  assert.equal(buildLegacyPinyinSlug("dé"), "de");
  assert.equal(buildLegacyPinyinSlug("dǎ diànhuà"), "da-dianhua");
});

test("vocabulary detail links encode Hanzi path segments and preserve sense query", () => {
  assert.equal(
    buildVocabularyDetailPath("得", { sense: "sense-1" }),
    "/vocabulary/%E5%BE%97?sense=sense-1",
  );
});
