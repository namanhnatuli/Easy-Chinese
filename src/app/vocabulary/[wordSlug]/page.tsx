import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AiSentenceGeneratorCard } from "@/components/ai/ai-sentence-generator-card";
import { HanziWriterAnimator } from "@/components/shared/hanzi-writer-animator";
import { PronunciationButton } from "@/components/shared/pronunciation-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WordSensesPanel } from "@/components/vocabulary/word-senses-panel";
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
  searchParams,
}: {
  params: Promise<{ wordSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { wordSlug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const word = await getPublicWordBySlug(wordSlug);
  const { t, link } = await getServerI18n();

  if (!word) {
    notFound();
  }

  const requestedSenseId = Array.isArray(resolvedSearchParams.sense)
    ? resolvedSearchParams.sense[0]
    : resolvedSearchParams.sense;
  const primarySense = word.resolvedSenses.find((sense) => sense.isPrimary) ?? word.resolvedSenses[0] ?? null;
  const displayedHanzi =
    word.traditionalVariant && word.traditionalVariant !== word.simplified
      ? `${word.simplified} [${word.traditionalVariant}]`
      : word.simplified;
  const wordCharacters = Array.from(word.simplified);
  const shouldShowWordComposition = wordCharacters.length > 1;
  const shouldShowStudyNotes = Boolean(word.hanViet || word.meaningsVi || word.readingCandidates || word.notes);

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

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <p className="text-pinyin">{primarySense?.pinyin ?? word.pinyin}</p>
                <PronunciationButton
                  text={word.simplified}
                  sourceType="word"
                  sourceRefId={word.id}
                  sourceMetadata={{
                    slug: word.slug,
                    pinyin: primarySense?.pinyin ?? word.pinyin,
                    vietnameseMeaning: word.vietnameseMeaning,
                  }}
                  label="Nghe từ"
                  className="rounded-full"
                />
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {word.vietnameseMeaning}
              </p>
              {word.englishMeaning ? (
                <p className="text-base text-muted-foreground">
                  {word.englishMeaning}
                </p>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hanzi Animator
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Xem thứ tự nét và nhận diện từng chữ trong từ.
                  </p>
                </div>
                {shouldShowWordComposition ? (
                  <Badge variant="outline">{`Cấu tạo từ ${wordCharacters.length} chữ`}</Badge>
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

            {shouldShowWordComposition || word.structureExplanation ? (
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cấu tạo từ
                </p>
                {shouldShowWordComposition ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-foreground">
                    <span>Từ này gồm:</span>
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
                    Từ nhiều chữ nên bạn có thể học theo từng chữ trước, rồi ghép lại để nhớ nghĩa và cách đọc của cả từ.
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <WordSensesPanel word={word} initialSenseId={requestedSenseId} />

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
                {word.sourceConfidence ? (
                  <p>
                    {t(
                      `vocabulary.sourceConfidence.${word.sourceConfidence}` as "vocabulary.sourceConfidence.low",
                    )}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {shouldShowStudyNotes || word.mnemonic || word.normalizedText || word.ambiguityFlag ? (
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

      <AiSentenceGeneratorCard
        wordId={word.id}
        title={t("ai.sentences.title")}
        description={t("ai.sentences.description")}
      />
    </div>
  );
}
