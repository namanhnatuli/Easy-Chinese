"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Star, Trash2, TriangleAlert } from "lucide-react";

import { Field, inputClassName, textareaClassName } from "@/components/admin/form-primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  deriveLegacyWordSummaryFromSenses,
  type AdminWordExampleDraft,
  type AdminWordSenseDraft,
} from "@/features/admin/word-senses";
import { PART_OF_SPEECH_LIST, TAG_LABELS } from "@/features/vocabulary-sync/constants";
import { useI18n } from "@/i18n/client";

function createEmptyExample(): AdminWordExampleDraft {
  return {
    chineseText: "",
    pinyin: "",
    vietnameseMeaning: "",
  };
}

function createEmptySense(nextOrder: number): AdminWordSenseDraft {
  return {
    id: null,
    pinyin: "",
    partOfSpeech: null,
    meaningVi: "",
    usageNote: null,
    senseOrder: nextOrder,
    isPrimary: false,
    isPublished: true,
    examples: [createEmptyExample()],
  };
}

function reorderSenses(senses: AdminWordSenseDraft[]) {
  return senses.map((sense, index) => ({
    ...sense,
    senseOrder: index + 1,
  }));
}

function ensurePrimarySense(senses: AdminWordSenseDraft[]) {
  if (senses.some((sense) => sense.isPrimary)) {
    return senses;
  }

  return senses.map((sense, index) => ({
    ...sense,
    isPrimary: index === 0,
  }));
}

export function WordSensesEditor({
  name,
  defaultValue,
  ambiguityFlag,
  sourceConfidence,
  readingCandidates,
}: {
  name: string;
  defaultValue: AdminWordSenseDraft[];
  ambiguityFlag: boolean;
  sourceConfidence: "low" | "medium" | "high" | null;
  readingCandidates: string | null;
}) {
  const { t } = useI18n();
  const [senses, setSenses] = useState<AdminWordSenseDraft[]>(
    defaultValue.length > 0
      ? reorderSenses(ensurePrimarySense(defaultValue))
      : [{ ...createEmptySense(1), isPrimary: true }],
  );

  const legacySummary = useMemo(() => deriveLegacyWordSummaryFromSenses(senses), [senses]);
  const normalizedStoredCandidates = readingCandidates?.split("|").map((value) => value.trim()).filter(Boolean).join(" | ") ?? null;
  const normalizedDerivedCandidates = legacySummary.readingCandidates ?? null;

  const warnings = [
    ambiguityFlag && senses.length === 1
      ? "Ambiguity is enabled, but the word currently has only one sense."
      : null,
    normalizedStoredCandidates && normalizedStoredCandidates !== normalizedDerivedCandidates
      ? `Existing reading candidates differ from the current senses. Saving will replace them with "${normalizedDerivedCandidates ?? ""}".`
      : null,
    sourceConfidence === "low"
      ? "Source confidence is low. Review the readings, meanings, and examples carefully before publishing."
      : null,
    ...senses.flatMap((sense, index) =>
      sense.examples.filter((example) => example.chineseText.trim().length > 0).length === 0
        ? [`Sense ${index + 1} has no examples yet.`]
        : [],
    ),
  ].filter((value): value is string => Boolean(value));

  function replaceSense(index: number, updater: (sense: AdminWordSenseDraft) => AdminWordSenseDraft) {
    setSenses((current) =>
      reorderSenses(
        current.map((sense, senseIndex) => (senseIndex === index ? updater(sense) : sense)),
      ),
    );
  }

  function setPrimarySense(index: number) {
    setSenses((current) =>
      reorderSenses(
        current.map((sense, senseIndex) => ({
          ...sense,
          isPrimary: senseIndex === index,
        })),
      ),
    );
  }

  function moveSense(index: number, direction: -1 | 1) {
    setSenses((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = current.slice();
      const [sense] = next.splice(index, 1);
      next.splice(nextIndex, 0, sense);
      return reorderSenses(next);
    });
  }

  function removeSense(index: number) {
    setSenses((current) => {
      if (current.length === 1) {
        return current;
      }

      const next = current.filter((_, senseIndex) => senseIndex !== index);
      if (!next.some((sense) => sense.isPrimary)) {
        next[0] = {
          ...next[0],
          isPrimary: true,
        };
      }

      return reorderSenses(next);
    });
  }

  function replaceExample(
    senseIndex: number,
    exampleIndex: number,
    updater: (example: AdminWordExampleDraft) => AdminWordExampleDraft,
  ) {
    replaceSense(senseIndex, (sense) => ({
      ...sense,
      examples: sense.examples.map((example, currentExampleIndex) =>
        currentExampleIndex === exampleIndex ? updater(example) : example,
      ),
    }));
  }

  return (
    <div className="space-y-6">
      <input type="hidden" name={name} value={JSON.stringify(senses)} />

      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <p className="text-sm font-semibold text-foreground">Legacy compatibility preview</p>
        <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <p>Pinyin: {legacySummary.pinyin || t("common.notAvailable")}</p>
          <p>{t("contentSync.detail.fields.meaningsVi")}: {legacySummary.meaningsVi || t("common.notAvailable")}</p>
          <p>{t("contentSync.detail.fields.partOfSpeech")}: {legacySummary.partOfSpeech || t("common.notAvailable")}</p>
          <p>{t("contentSync.detail.fields.readingCandidates")}: {legacySummary.readingCandidates || t("common.notAvailable")}</p>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="size-4" />
            Warnings
          </div>
          <div className="mt-3 space-y-2">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {senses.map((sense, senseIndex) => (
          <div key={`${sense.id ?? "new"}-${senseIndex}`} className="rounded-3xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-foreground">{`Sense ${senseIndex + 1}`}</p>
                  {sense.isPrimary ? (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="size-3" />
                      Primary
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Edit one reading/meaning group and keep its examples attached here.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => moveSense(senseIndex, -1)} disabled={senseIndex === 0}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => moveSense(senseIndex, 1)}
                  disabled={senseIndex === senses.length - 1}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setPrimarySense(senseIndex)}>
                  <Star className="size-4" />
                  Primary
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => removeSense(senseIndex)}
                  disabled={senses.length === 1}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label={t("contentSync.detail.fields.pinyin")}>
                <input
                  value={sense.pinyin}
                  onChange={(event) =>
                    replaceSense(senseIndex, (currentSense) => ({
                      ...currentSense,
                      pinyin: event.target.value,
                    }))
                  }
                  className={inputClassName()}
                />
              </Field>

              <Field label={t("contentSync.detail.fields.partOfSpeech")}>
                <select
                  value={sense.partOfSpeech ?? ""}
                  onChange={(event) =>
                    replaceSense(senseIndex, (currentSense) => ({
                      ...currentSense,
                      partOfSpeech: event.target.value || null,
                    }))
                  }
                  className={inputClassName()}
                >
                  <option value="">{t("common.notAvailable")}</option>
                  {PART_OF_SPEECH_LIST.map((entry) => (
                    <option key={entry} value={entry}>
                      {TAG_LABELS[entry] ?? entry}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t("contentSync.detail.fields.meaningsVi")}>
                <textarea
                  value={sense.meaningVi}
                  onChange={(event) =>
                    replaceSense(senseIndex, (currentSense) => ({
                      ...currentSense,
                      meaningVi: event.target.value,
                    }))
                  }
                  className={textareaClassName("min-h-24")}
                />
              </Field>

              <Field label={t("contentSync.detail.fields.notes")}>
                <textarea
                  value={sense.usageNote ?? ""}
                  onChange={(event) =>
                    replaceSense(senseIndex, (currentSense) => ({
                      ...currentSense,
                      usageNote: event.target.value.trim() ? event.target.value : null,
                    }))
                  }
                  className={textareaClassName("min-h-24")}
                />
              </Field>

              <Field label="Sense order">
                <input value={sense.senseOrder} readOnly className={inputClassName("bg-muted/40")} />
              </Field>

              <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
                <input
                  type="checkbox"
                  checked={sense.isPublished}
                  onChange={(event) =>
                    replaceSense(senseIndex, (currentSense) => ({
                      ...currentSense,
                      isPublished: event.target.checked,
                    }))
                  }
                />
                <span className="text-sm font-medium text-foreground">{t("admin.words.form.published")}</span>
              </label>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{t("contentSync.detail.fields.examples")}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    replaceSense(senseIndex, (currentSense) => ({
                      ...currentSense,
                      examples: [...currentSense.examples, createEmptyExample()],
                    }))
                  }
                >
                  <Plus className="size-4" />
                  {t("contentSync.detail.examples.add")}
                </Button>
              </div>

              <div className="space-y-3">
                {sense.examples.map((example, exampleIndex) => (
                  <div
                    key={`${sense.id ?? senseIndex}-example-${exampleIndex}`}
                    className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]"
                  >
                    <input
                      value={example.chineseText}
                      onChange={(event) =>
                        replaceExample(senseIndex, exampleIndex, (currentExample) => ({
                          ...currentExample,
                          chineseText: event.target.value,
                        }))
                      }
                      placeholder={t("contentSync.detail.examples.chinesePlaceholder")}
                      className={inputClassName("h-10 rounded-xl")}
                    />
                    <input
                      value={example.pinyin}
                      onChange={(event) =>
                        replaceExample(senseIndex, exampleIndex, (currentExample) => ({
                          ...currentExample,
                          pinyin: event.target.value,
                        }))
                      }
                      placeholder={t("contentSync.detail.examples.pinyinPlaceholder")}
                      className={inputClassName("h-10 rounded-xl")}
                    />
                    <input
                      value={example.vietnameseMeaning}
                      onChange={(event) =>
                        replaceExample(senseIndex, exampleIndex, (currentExample) => ({
                          ...currentExample,
                          vietnameseMeaning: event.target.value,
                        }))
                      }
                      placeholder={t("contentSync.detail.examples.meaningPlaceholder")}
                      className={inputClassName("h-10 rounded-xl")}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        replaceSense(senseIndex, (currentSense) => ({
                          ...currentSense,
                          examples:
                            currentSense.examples.length === 1
                              ? [createEmptyExample()]
                              : currentSense.examples.filter((_, currentExampleIndex) => currentExampleIndex !== exampleIndex),
                        }))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setSenses((current) => reorderSenses([...current, createEmptySense(current.length + 1)]))}
      >
        <Plus className="size-4" />
        Add sense
      </Button>
    </div>
  );
}
