import Link from "next/link";
import { z } from "zod";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listWritingPracticeWords } from "@/features/practice/queries";
import { getServerI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

const writingSearchSchema = z.object({
  lessonId: z.string().uuid().optional(),
});

export default async function PracticeWritingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = (await searchParams) ?? {};
  const resolvedSearchParams = writingSearchSchema.parse({
    lessonId: Array.isArray(rawSearchParams.lessonId) ? rawSearchParams.lessonId[0] : rawSearchParams.lessonId,
  });

  const [user, { t, link }] = await Promise.all([getCurrentUser(), getServerI18n()]);
  const words = await listWritingPracticeWords({
    userId: user?.id,
    lessonId: resolvedSearchParams.lessonId,
  });

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("practice.writing.eyebrow")}
        badge={t("practice.cards.writingHanzi.title")}
        title={t("practice.writing.title")}
        description={t("practice.writing.description")}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {words.map((word) => (
          <Link key={word.id} href={link(`/practice/writing/${word.id}`)} className="group block">
            <Card className="h-full border-border/80 bg-card/95 transition-transform duration-200 group-hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-3xl">{word.hanzi}</CardTitle>
                    <CardDescription className="mt-2">{word.pinyin}</CardDescription>
                  </div>
                  <Badge variant="secondary">HSK {word.hskLevel}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{word.vietnameseMeaning}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{t("practice.writing.characters", { count: word.characterCount })}</Badge>
                  <Badge variant="outline">{t("practice.writing.completedCount", { count: word.completedCharacters })}</Badge>
                  <Badge variant="outline">{t("practice.writing.difficultCount", { count: word.difficultCharacters })}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
