import assert from "node:assert/strict";
import test from "node:test";

import { resolveMainRadicalsAgainstAliases } from "@/features/vocabulary-sync/radical-alias";

test("resolveMainRadicalsAgainstAliases maps seeded aliases to canonical radicals", () => {
  const resolved = resolveMainRadicalsAgainstAliases(
    ["yêu (爫)", "tâm", "心"],
    [
      {
        radical: "爪",
        display_label: "Trảo 爪 (爫)",
        han_viet_name: "trảo",
        meaning_vi: "yêu",
        variant_forms: ["爫"],
      },
      {
        radical: "心",
        display_label: "Tâm 心 (忄, ⺗)",
        han_viet_name: "tâm",
        meaning_vi: "tim",
        variant_forms: ["忄", "⺗"],
      },
    ],
  );

  assert.deepEqual(resolved, ["爪", "心"]);
});
