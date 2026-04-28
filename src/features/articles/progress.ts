"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ensureProfileForUser } from "@/features/auth/profile";
import { requiredText } from "@/features/admin/shared-utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const articleProgressTargetSchema = z.object({
  articleId: z.string().uuid(),
  articleSlug: z.string().min(1),
});

async function requireArticleProgressUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await ensureProfileForUser(supabase, user);
  return {
    supabase,
    user: profile,
  };
}

async function requireReadableArticle(
  articleId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const { data, error } = await supabase
    .from("learning_articles")
    .select("id")
    .eq("id", articleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function revalidateArticleProgressPaths(articleSlug: string) {
  revalidatePath("/articles");
  revalidatePath(`/articles/${articleSlug}`);
  revalidatePath("/dashboard");
}

export async function getUserArticleProgress(articleId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_article_progress")
    .select("id, status, bookmarked, last_read_at, completed_at")
    .eq("user_id", userId)
    .eq("article_id", articleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function recordArticleRead(articleId: string) {
  const auth = await requireArticleProgressUser();
  if (!auth) {
    return { ok: false, authenticated: false as const };
  }

  const article = await requireReadableArticle(articleId, auth.supabase);
  if (!article) {
    return { ok: false, authenticated: true as const, readable: false as const };
  }

  const current = await getUserArticleProgress(articleId, auth.user.id);
  const nextStatus =
    current?.status === "completed"
      ? "completed"
      : current?.status === "reading"
        ? "reading"
        : "reading";

  const { error } = await auth.supabase.from("user_article_progress").upsert(
    {
      user_id: auth.user.id,
      article_id: articleId,
      status: nextStatus,
      bookmarked: current?.bookmarked ?? false,
      last_read_at: new Date().toISOString(),
      completed_at: nextStatus === "completed" ? current?.completed_at ?? new Date().toISOString() : null,
    },
    { onConflict: "user_id,article_id" },
  );

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard");
  return { ok: true, authenticated: true as const };
}

export async function toggleArticleBookmarkAction(formData: FormData) {
  const parsed = articleProgressTargetSchema.parse({
    articleId: requiredText(formData.get("article_id")),
    articleSlug: requiredText(formData.get("article_slug")),
  });
  const auth = await requireArticleProgressUser();
  if (!auth) {
    return;
  }

  const article = await requireReadableArticle(parsed.articleId, auth.supabase);
  if (!article) {
    return;
  }

  const current = await getUserArticleProgress(parsed.articleId, auth.user.id);
  const nextBookmarked = !(current?.bookmarked ?? false);
  const nextStatus = current?.status ?? "not_started";

  const { error } = await auth.supabase.from("user_article_progress").upsert(
    {
      user_id: auth.user.id,
      article_id: parsed.articleId,
      status: nextStatus,
      bookmarked: nextBookmarked,
      last_read_at: current?.last_read_at ?? null,
      completed_at: current?.completed_at ?? null,
    },
    { onConflict: "user_id,article_id" },
  );

  if (error) {
    throw error;
  }

  revalidateArticleProgressPaths(parsed.articleSlug);
}

export async function markArticleCompletedAction(formData: FormData) {
  const parsed = articleProgressTargetSchema.parse({
    articleId: requiredText(formData.get("article_id")),
    articleSlug: requiredText(formData.get("article_slug")),
  });
  const auth = await requireArticleProgressUser();
  if (!auth) {
    return;
  }

  const article = await requireReadableArticle(parsed.articleId, auth.supabase);
  if (!article) {
    return;
  }

  const current = await getUserArticleProgress(parsed.articleId, auth.user.id);
  const now = new Date().toISOString();

  const { error } = await auth.supabase.from("user_article_progress").upsert(
    {
      user_id: auth.user.id,
      article_id: parsed.articleId,
      status: "completed",
      bookmarked: current?.bookmarked ?? false,
      last_read_at: now,
      completed_at: current?.completed_at ?? now,
    },
    { onConflict: "user_id,article_id" },
  );

  if (error) {
    throw error;
  }

  revalidateArticleProgressPaths(parsed.articleSlug);
}
