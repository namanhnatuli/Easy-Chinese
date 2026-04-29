"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/client";
import type { AiExampleSentence } from "@/features/ai/types";

export function AiSentenceGeneratorCard({
  wordId,
  title,
  description,
}: {
  wordId: string;
  title: string;
  description: string;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentences, setSentences] = useState<AiExampleSentence[]>([]);

  async function handleGenerate() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/sentences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wordId, count: 3 }),
      });

      const body = (await response.json().catch(() => null)) as
        | { sentences: AiExampleSentence[]; message?: string }
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.message ?? t("ai.sentences.loadFailed"));
      }

      setSentences(body.sentences);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("ai.sentences.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={() => void handleGenerate()} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {t("ai.sentences.generate")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        {sentences.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">{t("ai.sentences.empty")}</p>
        ) : null}

        {sentences.map((sentence, index) => (
          <div key={`${sentence.chinese}-${index}`} className="rounded-[1.5rem] bg-muted/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg font-semibold text-foreground">{sentence.chinese}</p>
              <Badge variant="secondary">{t("ai.sentences.aiBadge")}</Badge>
            </div>
            <p className="mt-2 text-pinyin">{sentence.pinyin}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{sentence.vietnameseMeaning}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
