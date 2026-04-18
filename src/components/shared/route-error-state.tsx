"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RouteErrorState({
  title,
  description,
  reset,
}: {
  title: string;
  description: string;
  reset: () => void;
}) {
  return (
    <div className="page-shell">
      <Card className="border-destructive/30 bg-card/95" role="alert" aria-live="assertive">
        <CardHeader>
          <div className="mb-2 inline-flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
