"use server";

import { z } from "zod";

import { numberFromFormData, optionalText, requiredText, requireAdminSupabase, revalidateAdminPaths, redirectTo } from "@/features/admin/shared";

const radicalSchema = z.object({
  id: z.string().uuid().optional(),
  radical: z.string().min(1, "Radical is required."),
  meaningVi: z.string().min(1, "Vietnamese meaning is required."),
  strokeCount: z.number().int().min(0),
});

export interface RadicalListItem {
  id: string;
  radical: string;
  display_label: string | null;
  han_viet_name: string | null;
  meaning_vi: string;
  stroke_count: number;
  variant_forms: string[];
  updated_at: string;
}

export async function listRadicals(): Promise<RadicalListItem[]> {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("radicals")
    .select("id, radical, display_label, han_viet_name, meaning_vi, stroke_count, variant_forms, updated_at")
    .order("radical");

  if (error) throw error;
  return data ?? [];
}

export async function getRadicalById(id: string): Promise<RadicalListItem | null> {
  const { supabase } = await requireAdminSupabase();
  const { data, error } = await supabase
    .from("radicals")
    .select("id, radical, display_label, han_viet_name, meaning_vi, stroke_count, variant_forms, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveRadicalAction(formData: FormData) {
  const { supabase } = await requireAdminSupabase();
  const parsed = radicalSchema.parse({
    id: optionalText(formData.get("id")) ?? undefined,
    radical: requiredText(formData.get("radical")),
    meaningVi: requiredText(formData.get("meaning_vi")),
    strokeCount: numberFromFormData(formData.get("stroke_count")) ?? -1,
  });

  if (parsed.id) {
    const { error } = await supabase
      .from("radicals")
      .update({
        radical: parsed.radical,
        meaning_vi: parsed.meaningVi,
        stroke_count: parsed.strokeCount,
      })
      .eq("id", parsed.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("radicals").insert({
      radical: parsed.radical,
      meaning_vi: parsed.meaningVi,
      stroke_count: parsed.strokeCount,
    });

    if (error) throw error;
  }

  revalidateAdminPaths(["/admin", "/admin/radicals"]);
  redirectTo("/admin/radicals");
}

export async function deleteRadicalAction(formData: FormData) {
  const { supabase } = await requireAdminSupabase();
  const id = requiredText(formData.get("id"));
  const { error } = await supabase.from("radicals").delete().eq("id", id);

  if (error) throw error;

  revalidateAdminPaths(["/admin", "/admin/radicals"]);
  redirectTo("/admin/radicals");
}
