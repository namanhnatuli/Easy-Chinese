import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { HanziWriterAnimator } from "@/components/shared/hanzi-writer-animator";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WordSensesPanel } from "@/components/vocabulary/word-senses-panel";
import {
  formatPublicPartOfSpeech,
  formatPublicStructureType,
} from "@/features/public/vocabulary";
import { buildVocabularyDetailPath } from "@/features/public/vocabulary-slugs";
import { resolvePublicWordRoute } from "@/features/public/vocabulary.server";
import { getServerI18n } from "@/i18n/server";

const sourceConfidenceKey = {
  low: "vocabulary.sourceConfidence.low",
  medium: "vocabulary.sourceConfidence.medium",
  high: "vocabulary.sourceConfidence.high",
} as const;

function takeFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function appendSearchParams(pathname: string, searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    const firstValue = takeFirstSearchParam(value);
    if (firstValue) {
      params.set(key, firstValue);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ wordSlug: string }>;
}): Promise<Metadata> {
  const { wordSlug } = await params;
  const routeResolution = await resolvePublicWordRoute(wordSlug);

  if (routeResolution.kind !== "word") {
    return {
      title: "Vocabulary not found",
    };
  }

  const { word } = routeResolution;

  return {
    title: `${word.hanzi} (${word.pinyin})`,
    description: word.notes ?? word.vietnameseMeaning,
  };
}

export default async function VocabularyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ wordSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { wordSlug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const { t, link } = await getServerI18n();
  const routeResolution = await resolvePublicWordRoute(wordSlug);

  if (routeResolution.kind === "legacy-redirect") {
    redirect(
      link(
        appendSearchParams(
          buildVocabularyDetailPath(routeResolution.slug),
          resolvedSearchParams,
        ),
      ),
    );
  }

  if (routeResolution.kind === "legacy-disambiguation") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={t("vocabulary.detailEyebrow")}
          badge={t("vocabulary.legacyPinyinBadge")}
          title={t("vocabulary.legacyPinyinTitle", { value: routeResolution.pinyinSlug })}
          description={t("vocabulary.legacyPinyinDescription")}
          actions={
            <Button asChild>
              <Link href={link(`/vocabulary?pinyin=${encodeURIComponent(routeResolution.pinyinSlug)}`)}>
                {t("vocabulary.legacyPinyinSearch")}
              </Link>
            </Button>
          }
        />

        <section className="grid gap-4 md:grid-cols-2">
          {routeResolution.candidates.map((candidate) => (
            <Card key={candidate.id} className="border-border/80 bg-card/95">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-hanzi">{candidate.hanzi}</p>
                    <p className="mt-1 text-pinyin">{candidate.pinyin}</p>
                  </div>
                  <Badge variant="secondary">HSK {candidate.hskLevel}</Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{candidate.vietnameseMeaning}</p>
                <div className="mt-auto flex justify-end">
                  <Button asChild variant="outline">
                    <Link href={link(buildVocabularyDetailPath(candidate.canonicalSlug))}>
                      {t("vocabulary.openDetail")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    );
  }

  if (routeResolution.kind === "not-found") {
    notFound();
  }

  const word = routeResolution.word;

  const requestedSenseId = takeFirstSearchParam(resolvedSearchParams.sense);
  const displayedHanzi =
    word.traditionalVariant && word.traditionalVariant !== word.simplified
      ? `${word.simplified} [${word.traditionalVariant}]`
      : word.simplified;
  const wordCharacters = Array.from(word.simplified);
  const shouldShowWordComposition = wordCharacters.length > 1;
  const shouldShowStudyNotes = Boolean(word.hanViet || word.meaningsVi || word.readingCandidates || word.notes);
  const shouldShowMeaningGuide =
    shouldShowStudyNotes ||
    shouldShowWordComposition ||
    Boolean(word.structureExplanation || word.mnemonic || word.normalizedText || word.ambiguityFlag);
  const sourceConfidenceLabel = word.sourceConfidence ? t(sourceConfidenceKey[word.sourceConfidence]) : null;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("vocabulary.detailEyebrow")}
        badge={`HSK ${word.hskLevel}`}
        title={displayedHanzi}
        description={word.notes ?? word.vietnameseMeaning}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={link(`/practice/writing/${word.id}`)}>
                {t("practice.cta.writing")}
              </Link>
            </Button>
            <Button asChild>
              <Link href={link("/vocabulary")}>
                {t("common.backToVocabulary")}
              </Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card className="border-border/80 bg-card/95">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">HSK {word.hskLevel}</Badge>
              {word.topic ? (
                <Badge variant="outline">{word.topic.name}</Badge>
              ) : null}
              {formatPublicStructureType(word.characterStructureType) ? (
                <Badge variant="outline">
                  {t("vocabulary.structureBadge", {
                    value:
                      formatPublicStructureType(word.characterStructureType)
                        ?.label ?? "",
                  })}
                </Badge>
              ) : null}
              {word.ambiguityFlag ? (
                <Badge variant="warning">
                  {t("vocabulary.ambiguousBadge")}
                </Badge>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("vocabulary.hanziAnimator")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("vocabulary.hanziAnimatorDescription")}
                  </p>
                </div>
                {shouldShowWordComposition ? (
                  <Badge variant="outline">{t("vocabulary.characterCount", { value: wordCharacters.length })}</Badge>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                {wordCharacters.map((character, index) => (
                  <div
                    key={`${word.id}-${character}-${index}`}
                    className="flex min-w-[112px] flex-col items-center gap-3 rounded-2xl bg-muted/35 p-3 text-center"
                  >
                    <HanziWriterAnimator character={character} size={96} />
                    <span className="text-xl font-semibold text-foreground">
                      {character}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <WordSensesPanel word={word} initialSenseId={requestedSenseId} />
          </CardContent>
        </Card>

        <div className="space-y-4">
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
                      <Badge
                        key={`${word.id}-${entry.value}`}
                        variant="secondary"
                      >
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
                  {t("filters.hskLevel")}
                </p>
                <div className="mt-3">
                  <Badge variant="secondary">HSK {word.hskLevel}</Badge>
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
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {word.radicalSummary}
                  </p>
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
                {sourceConfidenceLabel ? <p>{sourceConfidenceLabel}</p> : null}
              </div>
            </CardContent>
          </Card>

          {shouldShowMeaningGuide ? (
            <Card className="border-border/80 bg-card/95">
              <CardHeader>
                <CardTitle>{t("vocabulary.meanings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {shouldShowStudyNotes ? (
                  <div className="space-y-2 text-foreground">
                    {word.hanViet ? <p>{t("vocabulary.hanViet", { value: word.hanViet })}</p> : null}
                    {word.meaningsVi ? (
                      <p>{t("vocabulary.meaningsVi", { value: word.meaningsVi })}</p>
                    ) : null}
                    {word.readingCandidates ? (
                      <p>{t("vocabulary.readingCandidates", { value: word.readingCandidates })}</p>
                    ) : null}
                    {word.notes ? <p className="leading-6">{word.notes}</p> : null}
                  </div>
                ) : null}

                {shouldShowWordComposition || word.structureExplanation ? (
                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("vocabulary.wordComposition")}
                    </p>
                    {shouldShowWordComposition ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-foreground">
                        <span>{t("vocabulary.wordIncludes")}</span>
                        {wordCharacters.map((character, index) => (
                          <Badge
                            key={`${word.id}-part-${character}-${index}`}
                            variant="secondary"
                          >
                            {character}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {word.structureExplanation ? (
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {word.structureExplanation}
                      </p>
                    ) : shouldShowWordComposition ? (
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {t("vocabulary.wordCompositionFallback")}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {word.mnemonic ? (
                  <div className="rounded-2xl bg-muted/35 p-4 text-foreground">
                    <span className="font-semibold">{t("vocabulary.mnemonic")}: </span>
                    {word.mnemonic}
                  </div>
                ) : null}

                {word.normalizedText ? (
                  <p className="text-muted-foreground">
                    {t("vocabulary.normalizedText", { value: word.normalizedText })}
                  </p>
                ) : null}

                {word.ambiguityFlag && word.ambiguityNote ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    {word.ambiguityNote}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}
