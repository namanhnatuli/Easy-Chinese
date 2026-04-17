import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  action,
  visual,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  visual?: ReactNode;
}) {
  return (
    <Card className="border-dashed bg-muted/30">
      <CardHeader>
        {visual ? <div className="mb-2">{visual}</div> : null}
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}
