import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sampleGrammarPoints } from "@/types/domain";

export default function GrammarPage() {
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Grammar"
        badge="Public browsing"
        title="Grammar patterns explained with Vietnamese-first clarity"
        description="Structure cues, explanations, and examples are separated cleanly so learners can understand the rule before memorizing the phrase."
      />

      <section className="grid gap-4">
        {sampleGrammarPoints.map((point) => (
          <Card key={point.id}>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold">{point.title}</p>
                <p className="mt-2 text-sm text-primary">{point.structureText}</p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{point.explanationVi}</p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/grammar/${point.slug}`}>Open detail</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
