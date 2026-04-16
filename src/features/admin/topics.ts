"use server";

import { z } from "zod";

import { booleanFromFormData, optionalText, requiredText, requireAdminSupabase, revalidateAdminPaths, redirectTo } from "@/features/admin/shared";

const topicSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Topic name is required."),
  slug: z.string().min(1, "Topic slug is required."),
  description: z.string().nullable(),
});

export interface TopicListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updated_at: string;
}

export async function listTopics(): Promise<TopicListItem[]> {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("topics")
    .select("id, name, slug, description, updated_at")
    .order("name");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getTopicById(id: string): Promise<TopicListItem | null> {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("topics")
    .select("id, name, slug, description, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveTopicAction(formData: FormData) {
  const { supabase } = await requireAdminSupabase();
  const parsed = topicSchema.parse({
    id: optionalText(formData.get("id")) ?? undefined,
    name: requiredText(formData.get("name")),
    slug: requiredText(formData.get("slug")),
    description: optionalText(formData.get("description")),
  });

  if (parsed.id) {
    const { error } = await supabase
      .from("topics")
      .update({
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description,
      })
      .eq("id", parsed.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("topics").insert({
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description,
    });

    if (error) throw error;
  }

  revalidateAdminPaths(["/admin", "/admin/topics"]);
  redirectTo("/admin/topics");
}

export async function deleteTopicAction(formData: FormData) {
  const { supabase } = await requireAdminSupabase();
  const id = requiredText(formData.get("id"));
  const { error } = await supabase.from("topics").delete().eq("id", id);

  if (error) throw error;

  revalidateAdminPaths(["/admin", "/admin/topics"]);
  redirectTo("/admin/topics");
}
