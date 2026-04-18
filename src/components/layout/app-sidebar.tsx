"use client";

import Link from "next/link";
import { BookOpen, LayoutDashboard, LibraryBig, RotateCcw, Settings, Shield, Sparkles, Upload } from "lucide-react";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/domain";

interface SidebarLink {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const publicLinks: SidebarLink[] = [
  { href: "/", label: "Home", description: "Overview and study path", icon: Sparkles },
  { href: "/lessons", label: "Lessons", description: "Structured lesson library", icon: BookOpen },
  { href: "/vocabulary", label: "Vocabulary", description: "Words by level and topic", icon: LibraryBig },
  { href: "/grammar", label: "Grammar", description: "Patterns and examples", icon: BookOpen },
];

const authenticatedLinks: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard", description: "Progress and review status", icon: LayoutDashboard },
  { href: "/review", label: "Review", description: "Due words and spaced repetition", icon: RotateCcw },
  { href: "/settings", label: "Settings", description: "Preferences and account", icon: Settings },
];

const adminLinks: SidebarLink[] = [
  { href: "/admin", label: "Admin", description: "Content workspace", icon: Shield },
  { href: "/admin/words", label: "Words", description: "Vocabulary library", icon: LibraryBig },
  { href: "/admin/import", label: "Import", description: "Bulk word upload", icon: Upload },
  { href: "/admin/grammar", label: "Grammar", description: "Grammar library", icon: BookOpen },
  { href: "/admin/lessons", label: "Lessons", description: "Lesson composition", icon: LayoutDashboard },
];

function SidebarNavList({
  title,
  links,
}: {
  title: string;
  links: SidebarLink[];
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-2">
      <p className="px-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
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
                  {link.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs",
                    active ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {link.description}
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
  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-6">
      <SidebarNavList title="Explore" links={publicLinks} />
      {user ? <SidebarNavList title="Account" links={authenticatedLinks} /> : null}
      {user?.role === "admin" ? <SidebarNavList title="Manage" links={adminLinks} /> : null}
    </nav>
  );
}

export function AppSidebar({ user }: { user: AuthUser | null }) {
  return (
    <aside className="hidden w-full max-w-[18rem] shrink-0 lg:block">
      <div className="sticky top-6 flex flex-col gap-6 rounded-[2rem] border border-border/80 bg-card/95 p-5 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-4">
          <Badge variant="default" className="w-fit">
            Study Product
          </Badge>
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold">Chinese Learning</h1>
            <p className="text-sm text-muted-foreground">
              Quiet structure for vocabulary, grammar, and focused lesson practice.
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.18),transparent_50%)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Today&apos;s focus
            </p>
            <p className="mt-2 text-base font-semibold">One lesson. Three practice modes.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep the session narrow and repeatable.
            </p>
          </div>
        </div>

        <Separator />
        <SidebarNavigation user={user} />
        <Separator />

        <div className="rounded-[1.5rem] bg-muted/50 p-4">
          <p className="text-sm font-semibold text-foreground">
            {user ? `Signed in as ${user.displayName ?? "learner"}` : "Anonymous mode enabled"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {user
              ? "Protected progress and admin routes stay separated by role."
              : "You can browse lessons and study without saved progress."}
          </p>
          {!user ? (
            <Button asChild variant="secondary" className="mt-4 w-full justify-center">
              <Link href="/auth/sign-in">Sign in to save progress</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
