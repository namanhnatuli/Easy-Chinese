"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/admin/form-primitives";
import { useI18n } from "@/i18n/client";

interface ExampleSlot {
  chineseText: string;
  pinyin: string;
  vietnameseMeaning: string;
}

function parseExamplesText(value: string): ExampleSlot[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [chineseText = "", pinyin = "", vietnameseMeaning = ""] = line
        .split("|")
        .map((part) => part.trim());

      return {
        chineseText,
        pinyin,
        vietnameseMeaning,
      };
    });
}

function serializeExamples(examples: ExampleSlot[]) {
  return examples
    .map((example) => [example.chineseText, example.pinyin, example.vietnameseMeaning].join(" | "))
    .join("\n");
}

export function WordExamplesEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const { t } = useI18n();
  const initialExamples = useMemo(() => parseExamplesText(defaultValue), [defaultValue]);
  const [examples, setExamples] = useState<ExampleSlot[]>(initialExamples);

  return (
    <div className="grid gap-4">
      <input type="hidden" name={name} value={serializeExamples(examples)} />

      <div className="flex items-center justify-between">
        <div />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setExamples([
              ...examples,
              { chineseText: "", pinyin: "", vietnameseMeaning: "" },
            ])
          }
          className="h-8 gap-1 rounded-full px-3"
        >
          <Plus className="size-3" />
          {t("contentSync.detail.examples.add")}
        </Button>
      </div>

      <div className="grid gap-4">
        {examples.map((example, index) => (
          <div
            key={index}
            className="group relative grid grid-cols-1 gap-3 rounded-2xl border bg-muted/20 p-4 transition-all hover:bg-muted/30 md:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <input
              value={example.chineseText}
              onChange={(event) =>
                setExamples((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, chineseText: event.target.value } : item,
                  ),
                )
              }
              placeholder={t("contentSync.detail.examples.chinesePlaceholder")}
              className={inputClassName("h-9 rounded-xl")}
            />
            <input
              value={example.pinyin}
              onChange={(event) =>
                setExamples((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, pinyin: event.target.value } : item,
                  ),
                )
              }
              placeholder={t("contentSync.detail.examples.pinyinPlaceholder")}
              className={inputClassName("h-9 rounded-xl")}
            />
            <input
              value={example.vietnameseMeaning}
              onChange={(event) =>
                setExamples((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, vietnameseMeaning: event.target.value }
                      : item,
                  ),
                )
              }
              placeholder={t("contentSync.detail.examples.meaningPlaceholder")}
              className={inputClassName("h-9 rounded-xl")}
            />
            <button
              type="button"
              onClick={() =>
                setExamples((current) => current.filter((_, itemIndex) => itemIndex !== index))
              }
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}

        {examples.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed py-4 text-center text-xs text-muted-foreground">
            {t("contentSync.empty.noExamples")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
