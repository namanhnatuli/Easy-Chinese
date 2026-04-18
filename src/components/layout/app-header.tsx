"use client";

import Link from "next/link";
import { Menu, PanelLeft, Search, Shield } from "lucide-react";
import { usePathname } from "next/navigation";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { SidebarNavigation } from "@/components/layout/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { stripLocaleFromPathname } from "@/i18n/navigation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/domain";

export function AppHeader({ user }: { user: AuthUser | null }) {
  const pathname = stripLocaleFromPathname(usePathname());
  const { t, link } = useI18n();
  const meta = (() => {
    if (pathname === "/lessons") {
      return {
        title: t("header.pageTitles.lessons.title"),
        description: t("header.pageTitles.lessons.description"),
      };
    }
    if (pathname === "/dashboard") {
      return {
        title: t("header.pageTitles.dashboard.title"),
        description: t("header.pageTitles.dashboard.description"),
      };
    }
    if (pathname === "/review") {
      return {
        title: t("header.pageTitles.review.title"),
        description: t("header.pageTitles.review.description"),
      };
    }
    if (pathname === "/settings") {
      return {
        title: t("header.pageTitles.settings.title"),
        description: t("header.pageTitles.settings.description"),
      };
    }
    if (pathname.startsWith("/admin")) {
      return {
        title: t("header.pageTitles.admin.title"),
        description: t("header.pageTitles.admin.description"),
      };
    }
    if (pathname.startsWith("/lessons/")) {
      return {
        title: t("header.pageTitles.lessonDetail.title"),
        description: t("header.pageTitles.lessonDetail.description"),
      };
    }
    if (pathname.startsWith("/learn/lesson/")) {
      return {
        title: t("header.pageTitles.studySession.title"),
        description: t("header.pageTitles.studySession.description"),
      };
    }
    return {
      title: t("header.pageTitles.home.title"),
      description: t("header.pageTitles.home.description"),
    };
  })();

  return (
    <header className="surface-panel sticky top-4 z-30 flex flex-col gap-4 border-border/80 bg-card/85 p-4 backdrop-blur sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t("header.openNavigation")}>
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="max-w-[20rem]">
              <SheetHeader>
                <SheetTitle>{t("header.mobileTitle")}</SheetTitle>
                <SheetDescription>{t("header.mobileDescription")}</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <SidebarNavigation user={user} />
              </div>
            </SheetContent>
          </Sheet>
          <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Link href={link("/lessons")} aria-label={t("header.browseLessonsAria")}>
              <PanelLeft className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {t("header.studyWorkspace")}
            </Badge>
            {user?.role === "admin" ? (
              <Badge variant="warning" className="inline-flex items-center gap-1">
                <Shield className="size-3.5" />
                {t("header.admin")}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-2 truncate text-2xl font-semibold text-foreground">{meta.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{meta.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link href={link("/lessons")}>
              <Search className="size-4" />
              {t("common.browseLessons")}
            </Link>
          </Button>
          <LanguageSwitcher authenticated={Boolean(user)} ariaLabel={t("settings.appLanguage")} />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="rounded-2xl px-4">
                  <span className="truncate">{user.displayName ?? "Learner"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href={link(user.role === "admin" ? "/admin" : "/dashboard")}>{t("common.workspace")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={link("/settings")}>{t("common.settings")}</Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={link("/auth/sign-out")} className={cn("text-rose-600")}>
                    {t("common.signOut")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href={link("/auth/sign-in")}>{t("common.signIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
