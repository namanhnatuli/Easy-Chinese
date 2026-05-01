"use client";

import { useTransition } from "react";
import { DatabaseZap, Loader2 } from "lucide-react";

import { Field, inputClassName } from "@/components/admin/form-primitives";
import { Button } from "@/components/ui/button";

export function ContentSyncStartForm({
  action,
  labels,
}: {
  action: (formData: FormData) => void | Promise<void>;
  labels: {
    spreadsheetId: string;
    spreadsheetPlaceholder: string;
    spreadsheetHint: string;
    sheetName: string;
    sheetPlaceholder: string;
    sheetHint: string;
    fromRow: string;
    fromRowPlaceholder: string;
    fromRowHint: string;
    toRow: string;
    toRowPlaceholder: string;
    toRowHint: string;
    submit: string;
    pending: string;
  };
}) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      await action(formData);
    });
  };

  return (
    <form action={handleAction} className="grid gap-x-4 gap-y-4 lg:grid-cols-[2fr_2fr_1fr_1fr_auto] lg:items-start relative">
      {isPending && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="mt-2 text-sm font-medium text-foreground">{labels.pending}</p>
        </div>
      )}
      <Field label={labels.spreadsheetId} hint={labels.spreadsheetHint}>
        <input
          name="spreadsheet_id"
          className={inputClassName()}
          placeholder={labels.spreadsheetPlaceholder}
        />
      </Field>
      <Field label={labels.sheetName} hint={labels.sheetHint}>
        <input
          name="sheet_name"
          className={inputClassName()}
          placeholder={labels.sheetPlaceholder}
        />
      </Field>
      <Field label={labels.fromRow} hint={labels.fromRowHint}>
        <input
          name="sync_from_row"
          type="number"
          min="1"
          className={inputClassName()}
          placeholder={labels.fromRowPlaceholder}
        />
      </Field>
      <Field label={labels.toRow} hint={labels.toRowHint}>
        <input
          name="sync_to_row"
          type="number"
          min="1"
          className={inputClassName()}
          placeholder={labels.toRowPlaceholder}
        />
      </Field>
      <div className="lg:pt-7 relative z-20">
        <Button type="submit" className="w-full lg:w-auto" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <DatabaseZap className="size-4" />}
          {isPending ? labels.pending : labels.submit}
        </Button>
      </div>
    </form>
  );
}
