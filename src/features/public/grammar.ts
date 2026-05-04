import { z } from "zod";

const grammarFilterSchema = z.object({
  hsk: z.coerce.number().int().min(1).max(9).optional(),
});

function takeFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function optionalQueryValue(value: string | string[] | undefined): string | undefined {
  const resolved = takeFirst(value)?.trim();
  return resolved ? resolved : undefined;
}

export interface GrammarFilters {
  hsk?: number;
}

export interface PublicGrammarListItem {
  id: string;
  title: string;
  slug: string;
  hskLevel: number;
  structureText: string;
  explanationVi: string;
  notes: string | null;
}

export interface PublicGrammarDetail extends PublicGrammarListItem {
  examples: Array<{
    id: string;
    chineseText: string;
    pinyin: string | null;
    vietnameseMeaning: string;
    sortOrder: number;
  }>;
}

export function parseGrammarFilters(searchParams: Record<string, string | string[] | undefined>) {
  return grammarFilterSchema.parse({
    hsk: optionalQueryValue(searchParams.hsk),
  });
}

export function mapGrammarPoint(row: {
  id: string;
  title: string;
  slug: string;
  hsk_level: number;
  structure_text: string;
  explanation_vi: string;
  notes: string | null;
}): PublicGrammarListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    hskLevel: row.hsk_level,
    structureText: row.structure_text,
    explanationVi: row.explanation_vi,
    notes: row.notes,
  };
}
