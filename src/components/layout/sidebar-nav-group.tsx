"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

interface SidebarNavItem {
  href: string;
  label: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
}

export function SidebarNavGroup({
  title,
  items,
  collapsed,
  initiallyOpen = false,
}: {
  title: string;
  items: SidebarNavItem[];
  collapsed: boolean;
  initiallyOpen?: boolean;
}) {
  const { link } = useI18n();
  const [open, setOpen] = useState(initiallyOpen);
  const hasActiveItem = items.some((item) => item.active);

  useEffect(() => {
    if (hasActiveItem) {
      setOpen(true);
    }
  }, [hasActiveItem]);

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={100}>
        <div className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={link(item.href)}
                    aria-current={item.active ? "page" : undefined}
                    className={cn(
                      "focus-ring flex h-11 w-11 items-center justify-center rounded-2xl transition-colors",
                      item.active
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="focus-ring flex w-full items-center justify-between rounded-xl px-2 py-1 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {title}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open ? "rotate-0" : "-rotate-90")} />
      </button>

      {open ? (
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={link(item.href)}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "focus-ring flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors",
                  item.active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-9 items-center justify-center rounded-2xl",
                    item.active ? "bg-white/15" : "bg-background",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold", item.active ? "text-primary-foreground" : "text-foreground")}>
                    {item.label}
                  </span>
                  {item.description ? (
                    <span className={cn("mt-0.5 block text-xs", item.active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
