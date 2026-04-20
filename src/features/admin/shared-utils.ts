import { z } from "zod";

export const uuidSchema = z.string().uuid();

export function optionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function requiredText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export function booleanFromFormData(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "1";
}

export function numberFromFormData(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface ParsedExampleInput {
  chineseText: string;
  pinyin: string | null;
  vietnameseMeaning: string;
  sortOrder: number;
}

export function parseExamplesTextarea(value: FormDataEntryValue | null): ParsedExampleInput[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [chineseText = "", pinyin = "", vietnameseMeaning = ""] = line
        .split("|")
        .map((part) => part.trim());

      return {
        chineseText,
        pinyin: pinyin || null,
        vietnameseMeaning,
        sortOrder: index + 1,
      };
    })
    .filter((example) => example.chineseText && example.vietnameseMeaning);
}

export interface OrderedSelection {
  id: string;
  sortOrder: number;
}

export function parseOrderedSelections(
  formData: FormData,
  prefix: "word" | "grammar",
): OrderedSelection[] {
  const selected: OrderedSelection[] = [];

  for (const [key, value] of formData.entries()) {
    const selectPrefix = `${prefix}_select_`;
    if (!key.startsWith(selectPrefix) || value !== "on") {
      continue;
    }

    const id = key.slice(selectPrefix.length);
    const sortOrder =
      numberFromFormData(formData.get(`${prefix}_order_${id}`)) ?? selected.length + 1;

    selected.push({ id, sortOrder });
  }

  return selected.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function examplesToTextarea(
  examples: Array<{
    chineseText: string;
    pinyin: string | null;
    vietnameseMeaning: string;
  }>,
): string {
  return examples
    .map((example) =>
      [example.chineseText, example.pinyin ?? "", example.vietnameseMeaning].join(" | "),
    )
    .join("\n");
}
