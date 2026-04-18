import test from "node:test";
import assert from "node:assert/strict";

import { PARSED_RADICAL_LIST, parseRadicalSeedLabel } from "@/features/vocabulary-sync/radical-seed";

test("parseRadicalSeedLabel extracts radical and variants from the full label", () => {
  const parsed = parseRadicalSeedLabel("Ngôn 言 (訁, 讠)");

  assert.equal(parsed.hanVietName, "Ngôn");
  assert.equal(parsed.radical, "言");
  assert.equal(parsed.displayLabel, "Ngôn 言 (訁, 讠)");
  assert.deepEqual(parsed.variantForms, ["訁", "讠"]);
});

test("parseRadicalSeedLabel strips notes from variant annotations", () => {
  const parsed = parseRadicalSeedLabel("Nguyệt 月 (⺝ khi làm bộ thịt)");

  assert.equal(parsed.radical, "月");
  assert.deepEqual(parsed.variantForms, ["⺝"]);
});

test("parsed radical list includes the full provided seed set", () => {
  assert.equal(PARSED_RADICAL_LIST.length, 210);
});
