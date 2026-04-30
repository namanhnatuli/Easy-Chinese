"use client";

import { X } from "lucide-react";

import { AppSidebarNavigation } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useI18n } from "@/i18n/client";

import type { AuthUser } from "@/types/domain";

export function MobileNavSheet({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuthUser | null;
}) {
  const { t } = useI18n();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[20rem] p-0 sm:max-w-[20rem]">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/70 px-5 py-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle>{t("common.appName")}</SheetTitle>
                <SheetDescription>{t("header.mobileDescription")}</SheetDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
                aria-label={t("common.close")}
              >
                <X className="size-4" />
              </Button>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <AppSidebarNavigation user={user} collapsed={false} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
