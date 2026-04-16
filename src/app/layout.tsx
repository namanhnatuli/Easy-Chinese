import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
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
      <body className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-950 antialiased">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
          <AppSidebar user={user} />
          <div className="flex-1 space-y-6">
            <AppHeader user={user} />
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
