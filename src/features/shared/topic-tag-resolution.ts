import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export interface TopicTagResolutionRow {
  id: string;
  slug: string;
  tag_slugs: string[] | null;
}

export interface ResolvedTopicAssignments {
  primaryTopicId: string | null;
  primaryTopicSlug: string | null;
  topicIdByTagSlug: Map<string, string>;
}

export async function loadTopicTagResolutionRows(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("topics")
    .select("id, slug, tag_slugs");

  if (error) {
    throw error;
  }

  return (data ?? []) as TopicTagResolutionRow[];
}

export function resolveTopicAssignmentsFromRows(
  rows: TopicTagResolutionRow[],
  tagSlugs: string[],
): ResolvedTopicAssignments {
  const normalizedTags = [...new Set(tagSlugs.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
  const topicIdByTagSlug = new Map<string, string>();
  let primaryTopicId: string | null = null;
  let primaryTopicSlug: string | null = null;

  for (const tagSlug of normalizedTags) {
    const matchedTopic = rows.find((row) => (row.tag_slugs ?? []).includes(tagSlug));
    if (!matchedTopic) {
      continue;
    }

    topicIdByTagSlug.set(tagSlug, matchedTopic.id);

    if (!primaryTopicId) {
      primaryTopicId = matchedTopic.id;
      primaryTopicSlug = matchedTopic.slug;
    }
  }

  return {
    primaryTopicId,
    primaryTopicSlug,
    topicIdByTagSlug,
  };
}
