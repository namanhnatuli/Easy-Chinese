"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, FileText, GraduationCap, LayoutDashboard, LibraryBig, PenTool, RotateCcw, Settings2, Shield, Sparkles, Upload, Volume2 } from "lucide-react";
import { usePathname } from "next/navigation";

import { SidebarNavGroup } from "@/components/layout/sidebar-nav-group";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { stripLocaleFromPathname } from "@/i18n/navigation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

import type { AuthUser } from "@/types/domain";

interface SidebarNavItemConfig {
  href: string;
  label: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
}

interface SidebarNavGroupConfig {
  key: string;
  title: string;
  items: SidebarNavItemConfig[];
}

function routeMatches(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getSidebarGroups(user: AuthUser | null, t: ReturnType<typeof useI18n>["t"]): SidebarNavGroupConfig[] {
  const groups: SidebarNavGroupConfig[] = [
    {
      key: "study",
      title: t("navigation.studyGroup"),
      items: [
        { href: "/", label: t("navigation.home.label"), description: t("navigation.home.description"), icon: Sparkles },
        { href: "/lessons", label: t("navigation.lessons.label"), description: t("navigation.lessons.description"), icon: GraduationCap },
        { href: "/vocabulary", label: t("navigation.vocabulary.label"), description: t("navigation.vocabulary.description"), icon: LibraryBig },
        { href: "/grammar", label: t("navigation.grammar.label"), description: t("navigation.grammar.description"), icon: BookOpen },
        { href: "/articles", label: t("navigation.articles.label"), description: t("navigation.articles.description"), icon: FileText },
      ],
    },
    {
      key: "practice",
      title: t("navigation.practiceGroup"),
      items: [
        { href: "/review", label: t("navigation.review.label"), description: t("navigation.review.description"), icon: RotateCcw },
        { href: "/practice/reading", label: t("dashboard.ctaPracticeReading"), description: t("dashboard.ctaPracticeReadingBody"), icon: BookOpen },
        { href: "/practice/writing", label: t("dashboard.ctaPracticeWriting"), description: t("dashboard.ctaPracticeWritingBody"), icon: PenTool },
        { href: "/practice", label: t("navigation.practice.label"), description: t("navigation.practice.description"), icon: Sparkles },
      ],
    },
  ];

  if (user) {
    groups.push({
      key: "progress",
      title: t("navigation.progressGroup"),
      items: [
        { href: "/dashboard", label: t("navigation.dashboard.label"), description: t("navigation.dashboard.description"), icon: LayoutDashboard },
      ],
    });
  }

  if (user?.role === "admin") {
    groups.push({
      key: "admin",
      title: t("navigation.adminGroup"),
      items: [
        { href: "/admin", label: t("navigation.admin.label"), description: t("navigation.admin.description"), icon: Shield },
        { href: "/admin/words", label: t("navigation.words.label"), description: t("navigation.words.description"), icon: LibraryBig },
        { href: "/admin/lessons", label: t("navigation.manageLessons.label"), description: t("navigation.manageLessons.description"), icon: GraduationCap },
        { href: "/admin/grammar", label: t("navigation.manageGrammar.label"), description: t("navigation.manageGrammar.description"), icon: BookOpen },
        { href: "/admin/articles", label: t("navigation.manageArticles.label"), description: t("navigation.manageArticles.description"), icon: FileText },
        { href: "/admin/content-sync", label: t("navigation.contentSync.label"), description: t("navigation.contentSync.description"), icon: Upload },
        { href: "/admin/import", label: t("navigation.import.label"), description: t("navigation.import.description"), icon: Upload },
        { href: "/admin/lesson-generator", label: t("navigation.lessonGenerator.label"), description: t("navigation.lessonGenerator.description"), icon: Sparkles },
        { href: "/admin/tts-cache", label: t("admin.ttsCache.title"), description: t("admin.ttsCache.description"), icon: Volume2 },
        { href: "/admin/topics", label: t("admin.topics.title"), description: t("admin.topics.description"), icon: Settings2 },
        { href: "/admin/radicals", label: t("admin.radicals.title"), description: t("admin.radicals.description"), icon: Settings2 },
      ],
    });
  }

  return groups;
}

export function AppSidebarNavigation({
  user,
  collapsed,
}: {
  user: AuthUser | null;
  collapsed: boolean;
}) {
  const { t } = useI18n();
  const pathname = stripLocaleFromPathname(usePathname());
  const groups = getSidebarGroups(user, t);

  return (
    <nav aria-label="Primary navigation" className={cn("flex flex-col gap-4", collapsed && "items-center")}>
      {groups.map((group) => (
        <SidebarNavGroup
          key={group.key}
          title={group.title}
          collapsed={collapsed}
          initiallyOpen={group.items.some((item) => routeMatches(pathname, item.href))}
          items={group.items.map((item) => ({
            ...item,
            active:
              routeMatches(pathname, item.href) &&
              !group.items.some((candidate) => candidate.href !== item.href && candidate.href.length > item.href.length && routeMatches(pathname, candidate.href)),
          }))}
        />
      ))}
    </nav>
  );
}

export function AppSidebar({
  user,
  collapsed,
  onToggleCollapsed,
}: {
  user: AuthUser | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { t, link } = useI18n();

  return (
    <aside
      className={cn(
        "sticky top-20 hidden h-[calc(100vh-6rem)] shrink-0 overflow-hidden rounded-[2rem] border border-border/80 bg-card/95 shadow-soft backdrop-blur lg:flex lg:flex-col",
        collapsed ? "w-[5.25rem]" : "w-[17.5rem]",
      )}
    >
      <div className={cn("flex items-center gap-3 border-b border-border/70 p-4", collapsed && "justify-center")}>
        {!collapsed ? (
          <Link href={link("/")} className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{t("common.appName")}</p>
            <p className="text-xs text-muted-foreground">{t("header.studyWorkspace")}</p>
          </Link>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl"
          aria-label={collapsed ? t("navigation.expandSidebar") : t("navigation.collapseSidebar")}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>

      <div className={cn("flex-1 overflow-y-auto p-3", collapsed && "px-2")}>
        <AppSidebarNavigation user={user} collapsed={collapsed} />
      </div>

      <Separator />
      <div className={cn("p-3", collapsed && "px-2")}>
        <Button
          asChild
          variant="ghost"
          className={cn(
            "h-auto w-full rounded-2xl p-0",
            collapsed ? "justify-center" : "justify-start",
          )}
        >
          <Link
            href={link("/settings")}
            aria-label={t("common.settings")}
            className={cn(
              "focus-ring flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted hover:text-foreground",
              collapsed ? "justify-center px-0" : "",
            )}
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-background">
              <Settings2 className="size-4" />
            </span>
            {!collapsed ? (
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{t("common.settings")}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t("navigation.settings.description")}
                </span>
              </span>
            ) : null}
          </Link>
        </Button>
      </div>
    </aside>
  );
}
