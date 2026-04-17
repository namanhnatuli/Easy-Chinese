import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AdminFormCard({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function inputClassName(className?: string) {
  return cn(
    "flex h-11 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-ring disabled:cursor-not-allowed disabled:opacity-50",
    className,
  );
}

export function textareaClassName(className?: string) {
  return cn(
    "flex min-h-32 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm transition-colors placeholder:text-muted-foreground focus-ring disabled:cursor-not-allowed disabled:opacity-50",
    className,
  );
}

export function checkboxClassName(className?: string) {
  return cn("size-4 rounded border-border text-primary focus-ring", className);
}

export function AdminSubmitRow({
  submitLabel,
  secondaryAction,
}: {
  submitLabel: string;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-3 pt-6">
      <button
        type="submit"
        className="focus-ring inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90"
      >
        {submitLabel}
      </button>
      {secondaryAction}
    </div>
  );
}
