import { buildGrammarContentHash } from "@/features/grammar-sync/content-hash";
import type {
  NormalizedGrammarExample,
  NormalizedGrammarSyncPayload,
  ParsedGrammarSyncRow,
} from "@/features/grammar-sync/types";
import type {
  VocabSyncChangeKind,
  WordAiStatus,
  WordReviewStatus,
  WordSourceConfidence,
} from "@/features/vocabulary-sync/types";

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requireText(value: unknown) {
  return normalizeOptionalText(value) ?? "";
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return ["true", "1", "yes", "y", "published", "approved"].includes(normalized);
}

function normalizeHskLevel(value: unknown) {
  const text = normalizeOptionalText(value);
  if (!text) {
    return null;
  }

  const number = Number(text);
  return Number.isInteger(number) && number >= 1 && number <= 9 ? number : null;
}

function normalizeSourceConfidence(value: unknown): WordSourceConfidence | null {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  return normalized === "low" || normalized === "medium" || normalized === "high" ? normalized : null;
}

function normalizeReviewStatus(value: unknown): WordReviewStatus {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (
    normalized === "pending" ||
    normalized === "needs_review" ||
    normalized === "approved" ||
    normalized === "rejected" ||
    normalized === "applied"
  ) {
    return normalized;
  }

  return "pending";
}

function normalizeAiStatus(value: unknown): WordAiStatus {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (
    normalized === "pending" ||
    normalized === "processing" ||
    normalized === "done" ||
    normalized === "failed" ||
    normalized === "skipped"
  ) {
    return normalized;
  }

  return "pending";
}

function normalizeSourceUpdatedAt(value: unknown) {
  const text = normalizeOptionalText(value);
  if (!text) {
    return null;
  }

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = match;
    const parsed = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ),
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const isoDate = new Date(text);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate.toISOString();
  }

  return null;
}

export function parseGrammarExamplesStructured(value: string | null): {
  examples: NormalizedGrammarExample[];
  errors: string[];
} {
  if (!value) {
    return { examples: [], errors: [] };
  }

  const errors: string[] = [];
  const examples = value
    .split(/\s+\|\|\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const fields = entry.split("|").reduce<Record<string, string>>((result, segment) => {
        const [key, ...rest] = segment.split("=");
        const normalizedKey = key?.trim().toUpperCase();
        if (!normalizedKey) {
          return result;
        }

        result[normalizedKey] = rest.join("=").trim();
        return result;
      }, {});

      const chineseText = fields.CN?.trim() ?? "";
      if (!chineseText) {
        errors.push(`Example ${index + 1}: CN is required.`);
        return null;
      }

      return {
        chineseText,
        pinyin: normalizeOptionalText(fields.PY),
        vietnameseMeaning: normalizeOptionalText(fields.VI),
        sortOrder: index + 1,
      };
    })
    .filter((example): example is NormalizedGrammarExample => Boolean(example));

  return { examples, errors };
}

export function buildGrammarSourceRowKey(payload: Pick<NormalizedGrammarSyncPayload, "slug" | "title" | "structureText">) {
  if (payload.slug) {
    return payload.slug;
  }

  return `${payload.title.normalize("NFKC").trim()}::${payload.structureText.normalize("NFKC").trim()}`;
}

export function parseAndNormalizeGrammarSyncRow(input: {
  rowNumber: number;
  values: Record<string, string>;
}): ParsedGrammarSyncRow {
  const raw = input.values;
  const parseErrors: string[] = [];
  const examplesResult = parseGrammarExamplesStructured(normalizeOptionalText(raw.examples_structured));

  parseErrors.push(...examplesResult.errors);

  const title = requireText(raw.title);
  const slug = normalizeSlug(requireText(raw.slug));
  const structureText = requireText(raw.structure_text);
  const explanationVi = requireText(raw.explanation_vi);
  const hskLevel = normalizeHskLevel(raw.hsk_level);
  const sourceUpdatedAt = normalizeSourceUpdatedAt(raw.updated_at);

  if (!title) parseErrors.push("title is required.");
  if (!slug) parseErrors.push("slug is required.");
  if (!structureText) parseErrors.push("structure_text is required.");
  if (!explanationVi) parseErrors.push("explanation_vi is required.");
  if (!hskLevel) parseErrors.push("hsk_level must be an integer from 1 to 9.");
  if (normalizeOptionalText(raw.updated_at) && !sourceUpdatedAt) {
    parseErrors.push("updated_at must be a valid date or timestamp.");
  }

  const normalizedPayload: NormalizedGrammarSyncPayload = {
    title,
    slug,
    structureText,
    explanationVi,
    notes: normalizeOptionalText(raw.notes),
    examples: examplesResult.examples,
    hskLevel,
    sourceConfidence: normalizeSourceConfidence(raw.source_confidence),
    ambiguityFlag: normalizeBoolean(raw.ambiguity_flag),
    ambiguityNote: normalizeOptionalText(raw.ambiguity_note),
    reviewStatus: normalizeReviewStatus(raw.review_status),
    aiStatus: normalizeAiStatus(raw.ai_status),
    sourceUpdatedAt,
  };
  const sourceRowKey = buildGrammarSourceRowKey(normalizedPayload);
  const initialChangeClassification: VocabSyncChangeKind | undefined =
    parseErrors.length > 0 ? "invalid" : undefined;

  return {
    rowNumber: input.rowNumber,
    rawPayload: raw,
    normalizedPayload,
    sourceRowKey: sourceRowKey || `row:${input.rowNumber}`,
    contentHash: buildGrammarContentHash(normalizedPayload),
    parseErrors,
    initialChangeClassification,
  };
}
