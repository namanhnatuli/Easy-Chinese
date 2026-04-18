"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FileUp, FileJson, Sheet } from "lucide-react";

import { importWordsAction, type WordImportState } from "@/features/admin/word-import";
import { HeaderActions, HeaderLinkButton, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/client";

const initialState: WordImportState = {
  ok: false,
  summary: {
    received: 0,
    inserted: 0,
    skipped: 0,
    failed: 0,
  },
  messages: [],
};

export function WordImportForm() {
  const { t, link } = useI18n();
  const [state, action, isPending] = useActionState(importWordsAction, initialState);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("admin.import.eyebrow")}
        badge={t("admin.import.badge")}
        title={t("admin.import.title")}
        description={t("admin.import.description")}
        actions={
          <HeaderActions
            secondary={<HeaderLinkButton href={link("/admin/words")} variant="outline">{t("admin.import.backToWords")}</HeaderLinkButton>}
          />
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>{t("admin.import.uploadTitle")}</CardTitle>
            <CardDescription>
              {t("admin.import.uploadDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">{t("admin.import.importFile")}</span>
                <input
                  type="file"
                  name="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="block w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                />
              </label>

              <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{t("admin.import.examplesTitle")}</p>
                <p className="mt-2">{t("admin.import.examplesDescription")}</p>
              </div>

              <Button type="submit" disabled={isPending}>
                <FileUp className="size-4" />
                {isPending ? t("admin.import.importing") : t("admin.import.runImport")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("admin.import.templatesTitle")}</CardTitle>
              <CardDescription>{t("admin.import.templatesDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/templates/words-import-template.csv">
                  <Sheet className="size-4" />
                  {t("admin.import.csvTemplate")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/templates/words-import-template.json">
                  <FileJson className="size-4" />
                  {t("admin.import.jsonTemplate")}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>{t("admin.import.latestResult")}</CardTitle>
              <CardDescription>{t("admin.import.latestResultDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{t("admin.import.received", { count: state.summary.received })}</Badge>
                <Badge variant="secondary">{t("admin.import.inserted", { count: state.summary.inserted })}</Badge>
                <Badge variant="secondary">{t("admin.import.skipped", { count: state.summary.skipped })}</Badge>
                <Badge variant="secondary">{t("admin.import.issues", { count: state.summary.failed })}</Badge>
              </div>

              {state.messages.length > 0 ? (
                <div
                  className="rounded-2xl border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <ul className="space-y-2">
                    {state.messages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("admin.import.noImportYet")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
