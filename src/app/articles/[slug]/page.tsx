import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleReadTracker } from "@/components/articles/article-read-tracker";
import { MarkdownRenderer } from "@/components/articles/markdown-renderer";
import { HeaderActions, HeaderLinkButton, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getUserArticleProgress,
  markArticleCompletedAction,
  toggleArticleBookmarkAction,
} from "@/features/articles/progress";
import { getPublicArticleBySlug } from "@/features/public/articles";
import { getServerI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, user, { t, link }] = await Promise.all([
    getPublicArticleBySlug(slug),
    getCurrentUser(),
    getServerI18n(),
  ]);

  if (!article) {
    notFound();
  }

  const progress = user ? await getUserArticleProgress(article.id, user.id) : null;

  return (
    <div className="page-shell">
      {user ? <ArticleReadTracker articleId={article.id} /> : null}

      <PageHeader
        eyebrow={t("articles.detailEyebrow")}
        badge={article.articleTypeLabel}
        title={article.title}
        description={article.summary}
        actions={
          <HeaderActions
            secondary={
              <HeaderLinkButton href={link("/articles")} variant="outline">
                {t("articles.backToArticles")}
              </HeaderLinkButton>
            }
            primary={
              user ? (
                <>
                  <form action={toggleArticleBookmarkAction}>
                    <input type="hidden" name="article_id" value={article.id} />
                    <input type="hidden" name="article_slug" value={article.slug} />
                    <Button type="submit" variant="outline">
                      {progress?.bookmarked ? t("articles.removeBookmark") : t("articles.bookmark")}
                    </Button>
                  </form>
                  <form action={markArticleCompletedAction}>
                    <input type="hidden" name="article_id" value={article.id} />
                    <input type="hidden" name="article_slug" value={article.slug} />
                    <Button type="submit">
                      {progress?.status === "completed" ? t("articles.completed") : t("articles.markCompleted")}
                    </Button>
                  </form>
                </>
              ) : (
                <HeaderLinkButton href={link("/auth/sign-in")}>
                  {t("articles.signInToTrack")}
                </HeaderLinkButton>
              )
            }
          />
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/80 bg-card/95">
          <CardContent className="p-6 sm:p-8">
            <MarkdownRenderer content={article.contentMarkdown} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("articles.overview")}</CardTitle>
              <CardDescription>{t("articles.overviewDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {article.hskLevel ? <Badge variant="secondary">HSK {article.hskLevel}</Badge> : null}
                <Badge variant="outline">{article.articleTypeLabel}</Badge>
                {article.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
              {user ? (
                <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  <p>{t("articles.progressStatus")}: {progress?.status ?? t("articles.notStarted")}</p>
                  <p className="mt-1">
                    {t("articles.bookmarkStatus")}: {progress?.bookmarked ? t("articles.bookmarked") : t("articles.notBookmarked")}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  {t("articles.anonymousHint")}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("articles.relatedWords")}</CardTitle>
              <CardDescription>{t("articles.relatedWordsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {article.relatedWords.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("articles.noRelatedWords")}</p>
              ) : (
                article.relatedWords.map((word) => (
                  <Link
                    key={word.id}
                    href={link(`/vocabulary/${word.slug}`)}
                    className="block rounded-2xl border border-border/80 p-4 transition-colors hover:bg-muted/40"
                  >
                    <p className="font-chinese text-xl font-semibold text-foreground">{word.hanzi}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{word.pinyin}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{word.vietnameseMeaning}</p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("articles.relatedGrammar")}</CardTitle>
              <CardDescription>{t("articles.relatedGrammarDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {article.relatedGrammarPoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("articles.noRelatedGrammar")}</p>
              ) : (
                article.relatedGrammarPoints.map((point) => (
                  <Link
                    key={point.id}
                    href={link(`/grammar/${point.slug}`)}
                    className="block rounded-2xl border border-border/80 p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{point.title}</p>
                      <Badge variant="secondary">HSK {point.hskLevel}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{point.structureText}</p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
