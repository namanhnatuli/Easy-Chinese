"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AiExplanationCard } from "@/components/ai/ai-explanation-card";
import { PronunciationButton } from "@/components/shared/pronunciation-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PublicWordDetail } from "@/features/public/vocabulary";
import { formatPublicPartOfSpeech } from "@/features/public/vocabulary";
import { useI18n } from "@/i18n/client";

function resolveSelectedSenseId(
  senses: PublicWordDetail["resolvedSenses"],
  requestedSenseId?: string | null,
) {
  if (requestedSenseId && senses.some((sense) => sense.id === requestedSenseId)) {
    return requestedSenseId;
  }

  return senses.find((sense) => sense.isPrimary)?.id ?? senses[0]?.id ?? "";
}

export function WordSensesPanel({
  word,
  initialSenseId,
}: {
  word: PublicWordDetail;
  initialSenseId?: string | null;
}) {
  const { t, link } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasMultipleSenses = word.resolvedSenses.length > 1;
  const [selectedSenseId, setSelectedSenseId] = useState(() =>
    resolveSelectedSenseId(word.resolvedSenses, initialSenseId),
  );

  useEffect(() => {
    setSelectedSenseId(resolveSelectedSenseId(word.resolvedSenses, initialSenseId));
  }, [initialSenseId, word.resolvedSenses]);

  const selectedSense =
    word.resolvedSenses.find((sense) => sense.id === selectedSenseId) ?? word.resolvedSenses[0] ?? null;

  function updateSenseSelection(nextSenseId: string) {
    setSelectedSenseId(nextSenseId);

    if (!hasMultipleSenses) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("sense", nextSenseId);
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  if (!selectedSense) {
    return null;
  }

  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader className="gap-3">
        <div>
          <CardTitle>{hasMultipleSenses ? "Cach doc va nghia" : t("vocabulary.meanings")}</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasMultipleSenses
              ? "Chon cach doc dung de xem nghia va vi du phu hop."
              : "Thong tin cach doc, nghia va vi du cua tu nay."}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasMultipleSenses ? (
          <div className="flex flex-wrap gap-2 rounded-[1.5rem] bg-muted/35 p-3">
            {word.resolvedSenses.map((sense) => (
              <Badge key={`compare-${sense.id}`} variant={sense.id === selectedSense.id ? "secondary" : "outline"}>
                {sense.pinyin} - {sense.shortMeaning}
              </Badge>
            ))}
          </div>
        ) : null}

        {hasMultipleSenses ? (
          <Tabs value={selectedSenseId} onValueChange={updateSenseSelection} className="space-y-4">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-[1.5rem] p-2">
              {word.resolvedSenses.map((sense) => {
                const partOfSpeechLabel = formatPublicPartOfSpeech(sense.partOfSpeech)[0]?.label;

                return (
                  <TabsTrigger
                    key={sense.id}
                    value={sense.id}
                    className="h-auto min-h-0 max-w-full whitespace-normal px-4 py-3 text-left"
                  >
                    <span className="flex flex-col items-start gap-1">
                      <span className="text-base font-semibold text-foreground">{sense.pinyin}</span>
                      {partOfSpeechLabel ? (
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {partOfSpeechLabel}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">{sense.shortMeaning}</span>
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {word.resolvedSenses.map((sense) => (
              <TabsContent key={sense.id} value={sense.id} className="mt-0">
                <SenseContent word={word} sense={sense} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <SenseContent word={word} sense={selectedSense} />
        )}

        <div className="flex flex-wrap gap-3 border-t border-border/70 pt-4">
          <Button asChild variant="outline">
            <Link href={link(`/practice/reading/words?word=${word.id}&sense=${selectedSense.id}`)}>
              {t("practice.cta.reading")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={link(`/practice/writing/${word.id}`)}>{t("practice.cta.writing")}</Link>
          </Button>
          <AiExplanationCard
            payload={{ kind: "word", wordId: word.id }}
            title={`${word.hanzi} · ${selectedSense.pinyin}`}
            description={selectedSense.meaningVi}
            triggerLabel={t("ai.explanation.open")}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SenseContent({
  word,
  sense,
}: {
  word: PublicWordDetail;
  sense: PublicWordDetail["resolvedSenses"][number];
}) {
  const { t } = useI18n();
  const partOfSpeechEntries = formatPublicPartOfSpeech(sense.partOfSpeech);

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-[1.75rem] border border-border/70 bg-background/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-pinyin">{sense.pinyin}</p>
            <p className="text-2xl font-semibold text-foreground">{sense.meaningVi}</p>
            {sense.meaningEn ? (
              <p className="text-sm text-muted-foreground">{sense.meaningEn}</p>
            ) : null}
          </div>
          <PronunciationButton
            text={word.simplified}
            sourceType="word"
            sourceRefId={word.id}
            sourceMetadata={{
              slug: word.slug,
              senseId: sense.id,
              pinyin: sense.pinyin,
              vietnameseMeaning: sense.meaningVi,
            }}
            label="Nghe cach doc nay"
            className="rounded-full"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {partOfSpeechEntries.length > 0 ? (
            partOfSpeechEntries.map((entry) => (
              <Badge key={`${sense.id}-${entry.value}`} variant="secondary">
                {entry.label}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">{t("common.notAvailable")}</Badge>
          )}
          {sense.isPrimary ? <Badge variant="outline">Primary</Badge> : null}
        </div>

        {sense.usageNote ? (
          <div className="rounded-2xl bg-muted/35 p-4 text-sm leading-6 text-foreground">
            {sense.usageNote}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("vocabulary.examples")}
          </p>
          <PronunciationButton
            text={word.simplified}
            sourceType="word"
            sourceRefId={word.id}
            sourceMetadata={{
              slug: word.slug,
              senseId: sense.id,
              pinyin: sense.pinyin,
            }}
            label="Nghe lai"
            className="rounded-full"
          />
        </div>

        {sense.examples.length === 0 ? (
          <div className="rounded-[1.5rem] bg-muted/40 p-4 text-sm text-muted-foreground">
            {t("vocabulary.noExamples")}
          </div>
        ) : (
          sense.examples.map((example) => (
            <div key={example.id} className="rounded-[1.5rem] bg-muted/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-lg font-semibold text-foreground">{example.chineseText}</p>
                <PronunciationButton
                  text={example.chineseText}
                  sourceType="example"
                  sourceRefId={example.id}
                  sourceMetadata={{
                    wordId: word.id,
                    wordSlug: word.slug,
                    senseId: sense.id,
                    pinyin: example.pinyin,
                    vietnameseMeaning: example.vietnameseMeaning,
                  }}
                  label="Nghe cau"
                  className="rounded-full"
                />
              </div>
              {example.pinyin ? <p className="mt-2 text-pinyin">{example.pinyin}</p> : null}
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{example.vietnameseMeaning}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
