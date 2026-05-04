import { createClient } from "@supabase/supabase-js";

import { buildUniqueWordSlug } from "../src/features/public/vocabulary-slugs";

interface WordSlugRow {
  id: string;
  slug: string;
  normalized_text: string | null;
  hanzi: string;
  simplified: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { data, error } = await supabase
  .from("words")
  .select("id, slug, normalized_text, hanzi, simplified")
  .order("hsk_level")
  .order("hanzi");

if (error) {
  throw error;
}

const words = (data ?? []) as WordSlugRow[];
const plannedSlugs = new Set<string>();
const changes: Array<{ id: string; oldSlug: string; newSlug: string; hanzi: string }> = [];

for (const word of words) {
  const nextSlug = buildUniqueWordSlug(
    {
      normalizedText: word.normalized_text,
      hanzi: word.hanzi,
      simplified: word.simplified,
    },
    plannedSlugs,
  );

  plannedSlugs.add(nextSlug);

  if (nextSlug !== word.slug) {
    changes.push({
      id: word.id,
      oldSlug: word.slug,
      newSlug: nextSlug,
      hanzi: word.hanzi,
    });
  }
}

console.info(`Found ${changes.length} word slug changes out of ${words.length} words.`);

for (const change of changes) {
  const { error: updateError } = await supabase
    .from("words")
    .update({ slug: change.newSlug })
    .eq("id", change.id);

  if (updateError) {
    throw updateError;
  }

  console.info(`${change.hanzi}: ${change.oldSlug} -> ${change.newSlug}`);
}
