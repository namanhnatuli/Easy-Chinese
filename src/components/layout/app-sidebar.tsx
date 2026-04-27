"use client";

import Link from "next/link";
import { BookOpen, LayoutDashboard, LibraryBig, RotateCcw, Settings, Shield, Sparkles, Upload } from "lucide-react";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { stripLocaleFromPathname } from "@/i18n/navigation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/domain";

interface SidebarLink {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

function SidebarNavList({
  title,
  links,
}: {
  title: string;
  links: SidebarLink[];
}) {
  const pathname = stripLocaleFromPathname(usePathname());
  const { link } = useI18n();

  return (
    <div className="flex flex-col gap-2">
      <p className="px-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {links.map((item) => {
          const matchesItem =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const hasMoreSpecificMatch = links.some((candidate) => {
            if (candidate.href === item.href || candidate.href.length <= item.href.length) {
              return false;
            }

            return pathname === candidate.href || pathname.startsWith(`${candidate.href}/`);
          });
          const active = matchesItem && !hasMoreSpecificMatch;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={link(item.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-ring flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-9 items-center justify-center rounded-2xl",
                  active ? "bg-white/15" : "bg-muted",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    active ? "text-primary-foreground" : "text-foreground",
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs",
                    active ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SidebarNavigation({ user }: { user: AuthUser | null }) {
  const { t } = useI18n();
  const publicLinks: SidebarLink[] = [
    { href: "/", label: t("navigation.home.label"), description: t("navigation.home.description"), icon: Sparkles },
    { href: "/lessons", label: t("navigation.lessons.label"), description: t("navigation.lessons.description"), icon: BookOpen },
    { href: "/vocabulary", label: t("navigation.vocabulary.label"), description: t("navigation.vocabulary.description"), icon: LibraryBig },
    { href: "/grammar", label: t("navigation.grammar.label"), description: t("navigation.grammar.description"), icon: BookOpen },
  ];
  const authenticatedLinks: SidebarLink[] = [
    { href: "/dashboard", label: t("navigation.dashboard.label"), description: t("navigation.dashboard.description"), icon: LayoutDashboard },
    { href: "/review", label: t("navigation.review.label"), description: t("navigation.review.description"), icon: RotateCcw },
    { href: "/settings", label: t("navigation.settings.label"), description: t("navigation.settings.description"), icon: Settings },
  ];
  const adminLinks: SidebarLink[] = [
    { href: "/admin", label: t("navigation.admin.label"), description: t("navigation.admin.description"), icon: Shield },
    { href: "/admin/words", label: t("navigation.words.label"), description: t("navigation.words.description"), icon: LibraryBig },
    { href: "/admin/import", label: t("navigation.import.label"), description: t("navigation.import.description"), icon: Upload },
    { href: "/admin/content-sync", label: t("navigation.contentSync.label"), description: t("navigation.contentSync.description"), icon: Sparkles },
    { href: "/admin/grammar", label: t("navigation.manageGrammar.label"), description: t("navigation.manageGrammar.description"), icon: BookOpen },
    { href: "/admin/lessons", label: t("navigation.manageLessons.label"), description: t("navigation.manageLessons.description"), icon: LayoutDashboard },
  ];

  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-6">
      <SidebarNavList title={t("navigation.explore")} links={publicLinks} />
      {user ? <SidebarNavList title={t("navigation.account")} links={authenticatedLinks} /> : null}
      {user?.role === "admin" ? <SidebarNavList title={t("navigation.manage")} links={adminLinks} /> : null}
    </nav>
  );
}

export function AppSidebar({ user }: { user: AuthUser | null }) {
  const { t, link } = useI18n();

  return (
    <aside className="hidden w-full max-w-[18rem] shrink-0 lg:block">
      <div className="sticky top-6 flex flex-col gap-6 rounded-[2rem] border border-border/80 bg-card/95 p-5 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-4">
          <Badge variant="default" className="w-fit">
            {t("header.studyWorkspace")}
          </Badge>
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold">{t("common.appName")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("header.pageTitles.home.description")}
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.18),transparent_50%)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("header.todayFocus")}
            </p>
            <p className="mt-2 text-base font-semibold">{t("header.focusHeadline")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("header.focusBody")}
            </p>
          </div>
        </div>

        <Separator />
        <SidebarNavigation user={user} />
        <Separator />

        <div className="rounded-[1.5rem] bg-muted/50 p-4">
          <p className="text-sm font-semibold text-foreground">
            {user
              ? t("header.signedInAs", { name: user.displayName ?? "learner" })
              : t("header.anonymousMode")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {user
              ? t("header.signedInBody")
              : t("header.anonymousBody")}
          </p>
          {!user ? (
            <Button asChild variant="secondary" className="mt-4 w-full justify-center">
              <Link href={link("/auth/sign-in")}>{t("header.saveProgressCta")}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
