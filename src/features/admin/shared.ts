import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth";

export * from "./shared-utils";

export async function requireAdminSupabase() {
  const auth = await requireAdminUser();
  const supabase = await createSupabaseServerClient();

  return {
    supabase,
    auth,
  };
}

export function revalidateAdminPaths(paths: string[]) {
  paths.forEach((path) => revalidatePath(path));
}

export function redirectTo(path: string) {
  redirect(path);
}
