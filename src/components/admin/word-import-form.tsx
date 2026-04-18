"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FileUp, FileJson, Sheet } from "lucide-react";

import { importWordsAction, type WordImportState } from "@/features/admin/word-import";
import { HeaderActions, HeaderLinkButton, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [state, action, isPending] = useActionState(importWordsAction, initialState);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Import"
        badge="Bulk operations"
        title="Import words from CSV or JSON"
        description="Upload a validated import file to create vocabulary entries in bulk. Invalid or duplicate rows are skipped with row-level reporting."
        actions={
          <HeaderActions
            secondary={<HeaderLinkButton href="/admin/words" variant="outline">Back to words</HeaderLinkButton>}
          />
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle>Upload file</CardTitle>
            <CardDescription>
              Required fields: <code>slug</code>, <code>simplified</code>, <code>hanzi</code>, <code>pinyin</code>, <code>vietnamese_meaning</code>, <code>hsk_level</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Import file</span>
                <input
                  type="file"
                  name="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="block w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                />
              </label>

              <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Examples support</p>
                <p className="mt-2">
                  JSON imports can provide an <code>examples</code> array. CSV imports can use an <code>examples_json</code> column containing a JSON array of example objects.
                </p>
              </div>

              <Button type="submit" disabled={isPending}>
                <FileUp className="size-4" />
                {isPending ? "Importing…" : "Run import"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Use the bundled templates to avoid formatting mistakes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/templates/words-import-template.csv">
                  <Sheet className="size-4" />
                  CSV template
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/templates/words-import-template.json">
                  <FileJson className="size-4" />
                  JSON template
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle>Latest result</CardTitle>
              <CardDescription>Import summary and row-level validation feedback.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Received: {state.summary.received}</Badge>
                <Badge variant="secondary">Inserted: {state.summary.inserted}</Badge>
                <Badge variant="secondary">Skipped: {state.summary.skipped}</Badge>
                <Badge variant="secondary">Issues: {state.summary.failed}</Badge>
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
                  No import has been run yet in this session.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
