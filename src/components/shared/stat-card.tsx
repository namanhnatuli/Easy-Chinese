import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  description,
  icon,
  accent = "default",
}: {
  label: string;
  value: string;
  description: string;
  icon?: ReactNode;
  accent?: "default" | "success" | "warning" | "dark";
}) {
  return (
    <Card
      className={cn(
        "border-border/80",
        accent === "dark" && "bg-slate-950 text-white",
        accent === "success" && "bg-emerald-50",
        accent === "warning" && "bg-amber-50",
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div>
          <p className={cn("text-sm font-medium", accent === "dark" ? "text-slate-300" : "text-muted-foreground")}>{label}</p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
          <p className={cn("mt-2 text-sm", accent === "dark" ? "text-slate-300" : "text-muted-foreground")}>{description}</p>
        </div>
        {icon ? <div className={cn("rounded-2xl p-3", accent === "dark" ? "bg-white/10" : "bg-background")}>{icon}</div> : null}
      </CardContent>
    </Card>
  );
}
