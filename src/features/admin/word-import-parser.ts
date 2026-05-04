import { z } from "zod";

const importExampleSchema = z.object({
  chineseText: z.string().trim().min(1, "Example Chinese text is required."),
  pinyin: z.string().trim().optional().nullable(),
  vietnameseMeaning: z.string().trim().min(1, "Example Vietnamese meaning is required."),
});

const importWordSchema = z.object({
  slug: z.string().trim().optional().nullable(),
  simplified: z.string().trim().min(1, "Simplified Chinese is required."),
  traditional: z.string().trim().optional().nullable(),
  hanzi: z.string().trim().min(1, "Hanzi is required."),
  pinyin: z.string().trim().min(1, "Pinyin is required."),
  hanViet: z.string().trim().optional().nullable(),
  vietnameseMeaning: z.string().trim().min(1, "Vietnamese meaning is required."),
  englishMeaning: z.string().trim().optional().nullable(),
  hskLevel: z.coerce.number().int().min(1).max(9),
  topicSlug: z.string().trim().optional().nullable(),
  radicalCharacter: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  isPublished: z.boolean().default(false),
  examples: z.array(importExampleSchema).default([]),
});

export interface ImportedWordInput extends z.infer<typeof importWordSchema> {}

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "published";
}

function parseExamplesJson(raw: unknown): ImportedWordInput["examples"] {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return z.array(importExampleSchema).parse(raw);
  }

  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }

  return z.array(importExampleSchema).parse(JSON.parse(raw));
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === "\"") {
      const nextCharacter = line[index + 1];

      if (inQuotes && nextCharacter === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsvRows(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const [headerLine, ...rowLines] = lines;
  const headers = parseCsvLine(headerLine);

  return rowLines.map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = cells[index] ?? "";
      return record;
    }, {});
  });
}

function mapRawImportRow(row: Record<string, unknown>) {
  return importWordSchema.parse({
    slug: normalizeNullableText(row.slug),
    simplified: row.simplified,
    traditional: normalizeNullableText(row.traditional),
    hanzi: row.hanzi ?? row.simplified,
    pinyin: row.pinyin,
    hanViet: normalizeNullableText(row.han_viet ?? row.hanViet),
    vietnameseMeaning: row.vietnamese_meaning ?? row.vietnameseMeaning,
    englishMeaning: normalizeNullableText(row.english_meaning ?? row.englishMeaning),
    hskLevel: row.hsk_level ?? row.hskLevel,
    topicSlug: normalizeNullableText(row.topic_slug ?? row.topicSlug),
    radicalCharacter: normalizeNullableText(row.radical ?? row.radicalCharacter),
    notes: normalizeNullableText(row.notes),
    isPublished: normalizeBoolean(row.published ?? row.isPublished),
    examples: parseExamplesJson(row.examples_json ?? row.examples),
  });
}

export function parseWordImportText(fileName: string, text: string): ImportedWordInput[] {
  const trimmed = text.trim();

  if (!trimmed) {
    return [];
  }

  if (fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    return z.array(z.record(z.string(), z.unknown())).parse(parsed).map(mapRawImportRow);
  }

  return parseCsvRows(trimmed).map(mapRawImportRow);
}

export function detectImportedWordDuplicates(words: ImportedWordInput[]) {
  const seenSlugs = new Set<string>();
  const seenPairs = new Set<string>();
  const duplicates: string[] = [];

  words.forEach((word, index) => {
    const slugKey = word.slug?.toLowerCase() ?? "";
    const pairKey = `${word.hanzi.toLowerCase()}::${word.vietnameseMeaning.toLowerCase()}`;

    if (slugKey && seenSlugs.has(slugKey)) {
      duplicates.push(`Row ${index + 2}: duplicate slug "${word.slug}" in import file.`);
    } else if (slugKey) {
      seenSlugs.add(slugKey);
    }

    if (seenPairs.has(pairKey)) {
      duplicates.push(
        `Row ${index + 2}: duplicate hanzi/meaning pair "${word.hanzi} / ${word.vietnameseMeaning}" in import file.`,
      );
    } else {
      seenPairs.add(pairKey);
    }
  });

  return duplicates;
}
