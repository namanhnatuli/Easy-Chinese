import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AiExplanationCard } from "@/components/ai/ai-explanation-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicGrammarPointBySlug } from "@/features/public/grammar.server";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ grammarSlug: string }>;
}): Promise<Metadata> {
  const { grammarSlug } = await params;
  const point = await getPublicGrammarPointBySlug(grammarSlug);

  if (!point) {
    return {
      title: "Grammar point not found",
    };
  }

  return {
    title: `${point.title} · HSK ${point.hskLevel}`,
    description: point.explanationVi,
  };
}

export default async function GrammarDetailPage({
  params,
}: {
  params: Promise<{ grammarSlug: string }>;
}) {
  const { grammarSlug } = await params;
  const point = await getPublicGrammarPointBySlug(grammarSlug);
  const { t, link } = await getServerI18n();

  if (!point) {
    notFound();
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t("grammar.detailEyebrow")}
        badge={`HSK ${point.hskLevel}`}
        title={point.title}
        description={point.explanationVi}
        actions={
          <div className="flex flex-wrap gap-3">
            <AiExplanationCard
              payload={{ kind: "grammar", grammarId: point.id }}
              title={t("ai.explanation.grammarTitle", { value: point.title })}
              description={t("ai.explanation.grammarDescription")}
              triggerLabel={t("ai.explanation.open")}
            />
            <Button asChild>
              <Link href={link("/grammar")}>{t("common.backToGrammar")}</Link>
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("grammar.structure")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="rounded-[1.5rem] bg-muted p-4 text-lg font-semibold text-primary">
              {point.structureText}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("grammar.explanation")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>{point.explanationVi}</p>
            {point.notes ? <Badge variant="secondary">{point.notes}</Badge> : null}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>{t("grammar.examples")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {point.examples.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("grammar.noExamples")}
              </p>
            ) : (
              point.examples.map((example) => (
                <div key={example.id} className="rounded-[1.5rem] bg-muted/50 p-4">
                  <p className="text-lg font-semibold text-foreground">{example.chineseText}</p>
                  {example.pinyin ? <p className="mt-2 text-pinyin">{example.pinyin}</p> : null}
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{example.vietnameseMeaning}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
