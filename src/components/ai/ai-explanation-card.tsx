"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import type { AiExplanationResult } from "@/features/ai/types";

type ExplanationPayload =
  | { kind: "word"; wordId: string }
  | { kind: "grammar"; grammarId: string }
  | { kind: "article"; articleId: string };

export function AiExplanationCard({
  payload,
  title,
  description,
  triggerLabel,
  autoLoad = false,
}: {
  payload: ExplanationPayload;
  title: string;
  description: string;
  triggerLabel: string;
  autoLoad?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiExplanationResult | null>(null);

  const cacheKey = useMemo(() => JSON.stringify(payload), [payload]);

  async function loadExplanation() {
    if (result || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: cacheKey,
      });

      const body = (await response.json().catch(() => null)) as AiExplanationResult & { message?: string };
      if (!response.ok) {
        throw new Error(body?.message ?? t("ai.explanation.loadFailed"));
      }

      setResult(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("ai.explanation.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoLoad) {
      void loadExplanation();
    }
  }, [autoLoad]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void loadExplanation();
          }}
        >
          <Sparkles className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("ai.explanation.loading")}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-muted/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("ai.explanation.meaning")}
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground">{result.explanation}</p>
            </div>

            {result.usage.length > 0 ? (
              <div className="rounded-2xl bg-muted/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("ai.explanation.usage")}
                </p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-foreground">
                  {result.usage.map((entry, index) => (
                    <p key={`${entry}-${index}`}>{entry}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {result.comparisons.length > 0 ? (
              <div className="rounded-2xl border border-border/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("ai.explanation.comparison")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.comparisons.map((comparison, index) => (
                    <Badge
                      key={`${comparison}-${index}`}
                      variant="secondary"
                      className="whitespace-normal text-left"
                    >
                      {comparison}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
