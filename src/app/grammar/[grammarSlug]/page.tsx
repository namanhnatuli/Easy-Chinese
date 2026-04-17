import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sampleGrammarPoints } from "@/types/domain";

export default async function GrammarDetailPage({
  params,
}: {
  params: Promise<{ grammarSlug: string }>;
}) {
  const { grammarSlug } = await params;
  const point = sampleGrammarPoints.find((entry) => entry.slug === grammarSlug);

  if (!point) notFound();

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Grammar detail"
        badge={`HSK ${point.hskLevel}`}
        title={point.title}
        description={point.explanationVi}
      />

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="rounded-[1.5rem] bg-muted p-4 text-lg font-semibold text-primary">
              {point.structureText}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Explanation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>{point.explanationVi}</p>
            {point.notes ? <Badge variant="secondary">{point.notes}</Badge> : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
