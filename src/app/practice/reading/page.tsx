import Link from "next/link";
import { BookOpenText, Languages } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerI18n } from "@/i18n/server";

const sections = [
  {
    href: "/practice/reading/words",
    icon: Languages,
    titleKey: "practice.cards.readingWords.title",
    descriptionKey: "practice.cards.readingWords.description",
  },
  {
    href: "/practice/reading/sentences",
    icon: BookOpenText,
    titleKey: "practice.cards.readingSentences.title",
    descriptionKey: "practice.cards.readingSentences.description",
  },
] as const;

export default async function PracticeReadingPage() {
  const { t, link } = await getServerI18n();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("practice.reading.eyebrow")}
        badge={t("common.home")}
        title={t("practice.reading.title")}
        description={t("practice.reading.description")}
      />

      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <Link key={section.href} href={link(section.href)} className="group block">
              <Card className="h-full border-border/80 bg-card/95 transition-transform duration-200 group-hover:-translate-y-1">
                <CardHeader>
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="pt-4">{t(section.titleKey)}</CardTitle>
                  <CardDescription>{t(section.descriptionKey)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t("practice.openModule")}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
