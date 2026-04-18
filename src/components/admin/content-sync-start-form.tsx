"use client";

import { DatabaseZap } from "lucide-react";

import { Field, inputClassName } from "@/components/admin/form-primitives";
import { Button } from "@/components/ui/button";

export function ContentSyncStartForm({
  action,
  labels,
}: {
  action: (formData: FormData) => void | Promise<void>;
  labels: {
    spreadsheetId: string;
    spreadsheetHint: string;
    sheetName: string;
    sheetHint: string;
    submit: string;
    pending: string;
  };
}) {
  return (
    <form action={action} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
      <Field label={labels.spreadsheetId} hint={labels.spreadsheetHint}>
        <input name="spreadsheet_id" className={inputClassName()} placeholder="1abc..." />
      </Field>
      <Field label={labels.sheetName} hint={labels.sheetHint}>
        <input name="sheet_name" className={inputClassName()} placeholder="Vocabulary" required />
      </Field>
      <Button type="submit">
        <DatabaseZap className="size-4" />
        {labels.submit}
      </Button>
    </form>
  );
}
