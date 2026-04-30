import Link from "next/link";
import { BookOpenText, Languages, PenTool, RotateCcw } from "lucide-react";

import { HeaderActions, HeaderLinkButton, PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

const modules = [
  {
    href: "/review",
    icon: RotateCcw,
    titleKey: "practice.cards.review.title",
    descriptionKey: "practice.cards.review.description",
    requiresAuth: true,
  },
  {
    href: "/practice/reading/words",
    icon: Languages,
    titleKey: "practice.cards.readingWords.title",
    descriptionKey: "practice.cards.readingWords.description",
    requiresAuth: false,
  },
  {
    href: "/practice/reading/sentences",
    icon: BookOpenText,
    titleKey: "practice.cards.readingSentences.title",
    descriptionKey: "practice.cards.readingSentences.description",
    requiresAuth: false,
  },
  {
    href: "/practice/writing",
    icon: PenTool,
    titleKey: "practice.cards.writingHanzi.title",
    descriptionKey: "practice.cards.writingHanzi.description",
    requiresAuth: false,
  },
] as const;

export default async function PracticePage() {
  const [user, { t, link }] = await Promise.all([getCurrentUser(), getServerI18n()]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("practice.eyebrow")}
        badge={user ? t("common.authenticated") : t("practice.anonymousBadge")}
        title={t("practice.title")}
        description={t("practice.description")}
        actions={
          <HeaderActions
            secondary={
              <HeaderLinkButton href={link("/review")} variant="outline">
                {t("common.continueReview")}
              </HeaderLinkButton>
            }
            primary={
              <HeaderLinkButton href={link("/vocabulary")}>
                {t("common.browseVocabulary")}
              </HeaderLinkButton>
            }
          />
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          const href = user || !module.requiresAuth ? module.href : "/auth/sign-in";

          return (
            <Link key={module.href} href={link(href)} className="group block">
              <Card className="h-full border-border/80 bg-card/95 transition-transform duration-200 group-hover:-translate-y-1">
                <CardHeader>
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="pt-4">{t(module.titleKey)}</CardTitle>
                  <CardDescription>{t(module.descriptionKey)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {module.requiresAuth && !user ? t("practice.signInForReview") : t("practice.openModule")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
