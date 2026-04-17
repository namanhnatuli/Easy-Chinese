"use client";

import Link from "next/link";
import { Menu, PanelLeft, Search, Shield } from "lucide-react";
import { usePathname } from "next/navigation";

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
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/domain";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Learn Chinese at your own pace",
    description: "Lessons, vocabulary, grammar, and focused practice in one calm workspace.",
  },
  "/lessons": {
    title: "Structured lessons",
    description: "Move through curated lesson paths with vocabulary and grammar together.",
  },
  "/dashboard": {
    title: "Progress dashboard",
    description: "Track review status, lesson completion, and what to study next.",
  },
  "/settings": {
    title: "Settings",
    description: "Adjust language, theme, and study preferences over time.",
  },
  "/admin": {
    title: "Admin workspace",
    description: "Manage curriculum content with draft and publish controls.",
  },
};

function resolvePageMeta(pathname: string) {
  const direct = pageTitles[pathname];
  if (direct) return direct;
  if (pathname.startsWith("/admin")) return pageTitles["/admin"];
  if (pathname.startsWith("/lessons/")) {
    return {
      title: "Lesson detail",
      description: "Review vocabulary and grammar before starting the focused study flow.",
    };
  }
  if (pathname.startsWith("/learn/lesson/")) {
    return {
      title: "Study session",
      description: "A high-focus learning surface for flashcards, multiple choice, and typing.",
    };
  }
  return pageTitles["/"];
}

export function AppHeader({ user }: { user: AuthUser | null }) {
  const pathname = usePathname();
  const meta = resolvePageMeta(pathname);

  return (
    <header className="surface-panel sticky top-4 z-30 flex flex-col gap-4 border-border/80 bg-card/85 p-4 backdrop-blur sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open navigation">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="max-w-[20rem]">
              <SheetHeader>
                <SheetTitle>Chinese Learning</SheetTitle>
                <SheetDescription>Navigate lessons, review pages, and admin tools.</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <SidebarNavigation user={user} />
              </div>
            </SheetContent>
          </Sheet>
          <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Link href="/lessons" aria-label="Browse lessons">
              <PanelLeft className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Study Workspace
            </Badge>
            {user?.role === "admin" ? (
              <Badge variant="warning" className="inline-flex items-center gap-1">
                <Shield className="size-3.5" />
                Admin
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-2 truncate text-2xl font-semibold text-foreground">{meta.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{meta.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link href="/lessons">
              <Search className="size-4" />
              Browse lessons
            </Link>
          </Button>

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
                    <Link href={user.role === "admin" ? "/admin" : "/dashboard"}>Workspace</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/auth/sign-out" className={cn("text-rose-600")}>
                    Sign out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
