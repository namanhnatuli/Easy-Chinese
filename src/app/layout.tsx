import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Chinese Learning App",
  description: "A calm Chinese study workspace built with Next.js and Supabase.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-6 px-4 py-4 sm:px-5 lg:flex-row lg:px-6 lg:py-6">
          <AppSidebar user={user} />
          <div className="min-w-0 flex-1 space-y-6">
            <AppHeader user={user} />
            <main className="page-shell">{children}</main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
