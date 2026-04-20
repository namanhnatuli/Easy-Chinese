export interface RadicalAliasRow {
  radical: string;
  display_label: string | null;
  han_viet_name: string | null;
  meaning_vi: string;
  variant_forms: string[] | null;
}

function normalizeRadicalAlias(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

function collectRadicalAliases(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const aliases = new Set<string>([trimmed]);
  const match = trimmed.match(/^(.*?)\s*\(([^)]+)\)\s*$/);

  if (match) {
    const [, before, inside] = match;
    if (before.trim()) aliases.add(before.trim());
    if (inside.trim()) aliases.add(inside.trim());
  }

  return [...aliases];
}

export function resolveMainRadicalsAgainstAliases(
  tokens: string[],
  radicalRows: RadicalAliasRow[],
) {
  const aliasToRadical = new Map<string, string>();

  for (const row of radicalRows) {
    for (const alias of [
      ...collectRadicalAliases(row.radical),
      ...collectRadicalAliases(row.display_label),
      ...collectRadicalAliases(row.han_viet_name),
      ...collectRadicalAliases(row.meaning_vi),
      ...((row.variant_forms ?? []).flatMap((value) => collectRadicalAliases(value))),
    ]) {
      aliasToRadical.set(normalizeRadicalAlias(alias), row.radical);
    }
  }

  const resolved: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const tokenAliases = collectRadicalAliases(token).map((alias) => normalizeRadicalAlias(alias));
    const mapped =
      tokenAliases.map((alias) => aliasToRadical.get(alias)).find((value): value is string => Boolean(value)) ??
      token.trim();

    if (!mapped || seen.has(mapped)) {
      continue;
    }

    seen.add(mapped);
    resolved.push(mapped);
  }

  return resolved;
}
