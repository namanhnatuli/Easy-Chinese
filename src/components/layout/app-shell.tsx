"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MainContentContainer } from "@/components/layout/main-content-container";
import { MobileNavSheet } from "@/components/layout/mobile-nav-sheet";
import { StickyTopHeader } from "@/components/layout/sticky-top-header";

import type { AuthUser, PreferredTheme } from "@/types/domain";

const sidebarStateStorageKey = "app:sidebar-collapsed";

export function AppShell({
  user,
  initialTheme,
  children,
}: {
  user: AuthUser | null;
  initialTheme: PreferredTheme;
  children: ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(sidebarStateStorageKey);
    setSidebarCollapsed(storedValue === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(sidebarStateStorageKey, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen">
      <StickyTopHeader
        user={user}
        initialTheme={initialTheme}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />

      <div className="flex gap-4 px-4 pb-6 pt-4 sm:px-5 lg:px-6">
        <AppSidebar
          user={user}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />
        <MainContentContainer>{children}</MainContentContainer>
      </div>

      <MobileNavSheet open={mobileNavOpen} onOpenChange={setMobileNavOpen} user={user} />
    </div>
  );
}
