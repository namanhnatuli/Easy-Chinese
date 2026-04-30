"use client";

import Link from "next/link";
import { ChevronDown, Menu, Shield } from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
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
import { useI18n } from "@/i18n/client";

import type { PreferredTheme, AuthUser } from "@/types/domain";

function getUserDisplayName(user: AuthUser) {
  return user.displayName?.trim() || user.email?.trim() || "Learner";
}

function getUserInitials(user: AuthUser) {
  const displayName = getUserDisplayName(user);
  const parts = displayName.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "L";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function StickyTopHeader({
  user,
  initialTheme,
  onOpenMobileNav,
}: {
  user: AuthUser | null;
  initialTheme: PreferredTheme;
  onOpenMobileNav: () => void;
}) {
  const { t, link } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl lg:hidden"
            aria-label={t("header.openNavigation")}
            onClick={onOpenMobileNav}
          >
            <Menu className="size-4" />
          </Button>

          <Link href={link("/")} className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft">
              中
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{t("common.appName")}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">{t("header.studyWorkspace")}</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link href={link("/lessons")}>{t("common.browseLessons")}</Link>
          </Button>

          <LanguageSwitcher
            authenticated={Boolean(user)}
            ariaLabel={t("settings.appLanguage")}
            compact
            triggerClassName="w-11 min-w-0 rounded-xl px-0 md:w-auto md:min-w-[8.75rem] md:px-3"
          />

          <ThemeSwitcher authenticated={Boolean(user)} initialTheme={initialTheme} />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-11 rounded-full px-2.5"
                  aria-label={t("header.account")}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex size-8 overflow-hidden rounded-full border border-border/70 bg-muted">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={getUserDisplayName(user)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-foreground">
                          {getUserInitials(user)}
                        </span>
                      )}
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t("header.account")}</DropdownMenuLabel>
                <div className="px-2 pb-2">
                  <p className="text-sm font-semibold text-foreground">{getUserDisplayName(user)}</p>
                  {user.email ? <p className="text-xs text-muted-foreground">{user.email}</p> : null}
                </div>
                <DropdownMenuSeparator />
                {user.role === "admin" ? (
                  <>
                    <div className="px-2 pb-1">
                      <Badge variant="warning" className="inline-flex items-center gap-1">
                        <Shield className="size-3.5" />
                        {t("header.admin")}
                      </Badge>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
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
                  <a href={link("/auth/sign-out")} className="text-rose-600">
                    {t("common.signOut")}
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="rounded-xl">
              <Link href={link("/auth/sign-in")}>{t("common.signIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
