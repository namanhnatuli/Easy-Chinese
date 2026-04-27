import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatPublicPartOfSpeech,
  formatPublicStructureType,
  getPublicWordBySlug,
} from "@/features/public/vocabulary";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ wordSlug: string }>;
}): Promise<Metadata> {
  const { wordSlug } = await params;
  const word = await getPublicWordBySlug(wordSlug);

  if (!word) {
    return {
      title: "Vocabulary not found",
    };
  }

  return {
    title: `${word.hanzi} (${word.pinyin})`,
    description: word.notes ?? word.vietnameseMeaning,
  };
}

export default async function VocabularyDetailPage({
  params,
}: {
  params: Promise<{ wordSlug: string }>;
}) {
  const { wordSlug } = await params;
  const word = await getPublicWordBySlug(wordSlug);
  const { t, link } = await getServerI18n();

  if (!word) {
    notFound();
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("vocabulary.detailEyebrow")}
        badge={`HSK ${word.hskLevel}`}
        title={word.hanzi}
        description={word.notes ?? word.vietnameseMeaning}
        actions={
          <Button asChild>
            <Link href={link("/vocabulary")}>{t("common.backToVocabulary")}</Link>
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card className="border-border/80 bg-card/95">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">HSK {word.hskLevel}</Badge>
              {word.topic ? <Badge variant="outline">{word.topic.name}</Badge> : null}
              {formatPublicStructureType(word.characterStructureType) ? (
                <Badge variant="outline">
                  {t("vocabulary.structureBadge", {
                    value: formatPublicStructureType(word.characterStructureType)?.label ?? "",
                  })}
                </Badge>
              ) : null}
              {word.ambiguityFlag ? (
                <Badge variant="warning">{t("vocabulary.ambiguousBadge")}</Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-pinyin">{word.pinyin}</p>
              <p className="text-2xl font-semibold text-foreground">{word.vietnameseMeaning}</p>
              {word.englishMeaning ? <p className="text-base text-muted-foreground">{word.englishMeaning}</p> : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("vocabulary.forms")}
                </p>
                <div className="mt-3 space-y-2 text-sm text-foreground">
                  <p>{t("vocabulary.simplifiedValue", { value: word.simplified })}</p>
                  <p>{t("vocabulary.traditionalValue", { value: word.traditionalVariant ?? word.traditional ?? t("common.notAvailable") })}</p>
                  {word.normalizedText ? <p>{t("vocabulary.normalizedText", { value: word.normalizedText })}</p> : null}
                </div>
              </div>

              <div className="rounded-2xl bg-muted/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("vocabulary.meanings")}
                </p>
                <div className="mt-3 space-y-2 text-sm text-foreground">
                  {word.hanViet ? <p>{t("vocabulary.hanViet", { value: word.hanViet })}</p> : null}
                  {word.meaningsVi ? <p>{t("vocabulary.meaningsVi", { value: word.meaningsVi })}</p> : null}
                  {word.readingCandidates ? <p>{t("vocabulary.readingCandidates", { value: word.readingCandidates })}</p> : null}
                </div>
              </div>
            </div>

            {word.notes ? (
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-sm leading-7 text-muted-foreground">{word.notes}</p>
              </div>
            ) : null}

            {word.ambiguityFlag && word.ambiguityNote ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {word.ambiguityNote}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("vocabulary.wordProfile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("vocabulary.partOfSpeech")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {formatPublicPartOfSpeech(word.partOfSpeech).length > 0 ? (
                  formatPublicPartOfSpeech(word.partOfSpeech).map((entry) => (
                    <Badge key={`${word.id}-${entry.value}`} variant="secondary">
                      {entry.label}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">{t("common.notAvailable")}</Badge>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("vocabulary.radicals")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {word.radicals.length > 0 ? (
                  word.radicals.map((radical) => (
                    <Badge key={`${word.id}-${radical.id}`} variant="outline">
                      {radical.radical} · {radical.meaningVi}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">{t("common.notAvailable")}</Badge>
                )}
              </div>
              {word.radicalSummary ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{word.radicalSummary}</p>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("vocabulary.topicTags")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {word.topicTags.length > 0 ? (
                  word.topicTags.map((tag) => (
                    <Badge key={`${word.id}-${tag.slug}`} variant="secondary">
                      #{tag.label}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">{t("common.notAvailable")}</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t("vocabulary.slug", { value: word.slug })}</p>
              {word.sourceConfidence ? (
                <p>{t(`vocabulary.sourceConfidence.${word.sourceConfidence}` as "vocabulary.sourceConfidence.low")}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("vocabulary.examples")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {word.examples.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("vocabulary.noExamples")}</p>
            ) : (
              word.examples.map((example) => (
                <div key={example.id} className="rounded-[1.5rem] bg-muted/50 p-4">
                  <p className="text-lg font-semibold text-foreground">{example.chineseText}</p>
                  {example.pinyin ? <p className="mt-2 text-pinyin">{example.pinyin}</p> : null}
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{example.vietnameseMeaning}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("vocabulary.learningHints")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {word.mnemonic ? (
              <div className="rounded-2xl bg-muted/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("vocabulary.mnemonic")}
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground">{word.mnemonic}</p>
              </div>
            ) : null}

            {word.structureExplanation ? (
              <div className="rounded-2xl bg-muted/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("vocabulary.structureExplanation")}
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground">{word.structureExplanation}</p>
              </div>
            ) : null}

            {!word.mnemonic && !word.structureExplanation ? (
              <p className="text-sm text-muted-foreground">{t("vocabulary.noLearningHints")}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
