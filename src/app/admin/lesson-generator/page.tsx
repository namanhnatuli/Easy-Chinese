import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LessonGeneratorForm } from "@/components/admin/lesson-generator-form";
import { LessonGeneratorReview } from "@/components/admin/lesson-generator-review";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateLessonPreview,
  getLessonGenerationCoverageSummary,
  listLessonGeneratorTagOptions,
  parseLessonGeneratorInput,
  saveGeneratedLessonDraftAction,
} from "@/features/admin/lesson-generator";
import { getServerI18n } from "@/i18n/server";
import { requireAdminUser } from "@/lib/auth";

export default async function LessonGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const { t } = await getServerI18n();
  const searchParamsValue = await searchParams;
  const generatorInput = parseLessonGeneratorInput(searchParamsValue);
  const [tagOptions, coverageSummary, preview] = await Promise.all([
    listLessonGeneratorTagOptions(),
    getLessonGenerationCoverageSummary(),
    generatorInput ? generateLessonPreview(generatorInput) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={t("admin.lessonGenerator.eyebrow")}
        title={t("admin.lessonGenerator.title")}
        description={t("admin.lessonGenerator.description")}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("admin.lessonGenerator.coverage.unusedWords")}</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">
            {coverageSummary.wordsWithoutLessons}
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("admin.lessonGenerator.coverage.reusedWords")}</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">
            {coverageSummary.wordsUsedInMultipleLessons}
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("admin.lessonGenerator.coverage.eligibleWords")}</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-foreground">
            {coverageSummary.totalEligibleWords}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <LessonGeneratorForm tagOptions={tagOptions} initialValue={generatorInput} />

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("admin.lessonGenerator.coverage.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">{t("admin.lessonGenerator.coverage.byHsk")}</p>
              <div className="space-y-2">
                {coverageSummary.coverageByHsk.map((entry) => (
                  <div key={entry.hskLevel} className="rounded-2xl border border-border bg-muted/20 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">HSK {entry.hskLevel}</span>
                      <span className="text-muted-foreground">
                        {entry.usedWords}/{entry.totalWords}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("admin.lessonGenerator.coverage.unusedWordsShort", { count: entry.unusedWords })}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">{t("admin.lessonGenerator.coverage.byTag")}</p>
              <div className="space-y-2">
                {coverageSummary.coverageByTag.map((entry) => (
                  <div key={entry.slug} className="rounded-2xl border border-border bg-muted/20 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{entry.label}</span>
                      <span className="text-muted-foreground">
                        {entry.usedWords}/{entry.totalWords}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{entry.slug}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {preview ? <LessonGeneratorReview preview={preview} saveAction={saveGeneratedLessonDraftAction} /> : null}
    </div>
  );
}

