import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  description,
  icon,
  accent = "default",
  variant = "default",
}: {
  label: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  accent?: "default" | "success" | "warning" | "destructive" | "dark";
  variant?: "default" | "compact";
}) {
  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "border-border/80 transition-colors hover:border-border",
          accent === "dark" && "bg-slate-950 text-white",
          accent === "success" && "bg-emerald-50 text-emerald-900 border-emerald-200",
          accent === "warning" && "bg-amber-50 text-amber-900 border-amber-200",
          accent === "destructive" && "bg-red-50 text-red-900 border-red-200",
        )}
      >
        <CardContent className="flex items-center gap-2 p-3">
          <div className={cn("shrink-0 rounded-lg p-1.5", accent === "dark" ? "bg-white/10" : "bg-background shadow-sm border")}>
            {icon ? <div className="text-foreground">{icon}</div> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-[10px] font-bold uppercase tracking-wider opacity-60", accent === "dark" ? "text-slate-300" : "text-muted-foreground")}>
              {label}
            </p>
            <p className="text-lg font-bold tabular-nums leading-none mt-0.5">{value}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-border/80 shadow-sm",
        accent === "dark" && "bg-slate-950 text-white",
        accent === "success" && "bg-emerald-50",
        accent === "warning" && "bg-amber-50",
        accent === "destructive" && "bg-red-50",
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div>
          <p className={cn("text-sm font-medium", accent === "dark" ? "text-slate-300" : "text-muted-foreground")}>{label}</p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
          <p className={cn("mt-2 text-sm leading-relaxed", accent === "dark" ? "text-slate-300" : "text-muted-foreground")}>{description}</p>
        </div>
        {icon ? <div className={cn("rounded-2xl p-3 shadow-sm border", accent === "dark" ? "bg-white/10" : "bg-background")}>{icon}</div> : null}
      </CardContent>
    </Card>
  );
}
