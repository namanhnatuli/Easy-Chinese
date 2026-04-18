import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Inter,
  Noto_Sans_SC,
  Noto_Serif_SC,
  Sora,
  Source_Serif_4,
} from "next/font/google";

import "@/app/globals.css";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PreferencesProvider } from "@/components/settings/preferences-provider";
import { Toaster } from "@/components/ui/sonner";
import { getAuthContext } from "@/lib/auth";
import { I18nProvider } from "@/i18n/client";
import { getServerI18n } from "@/i18n/server";
import {
  normalizeFontPreference,
  normalizeThemePreference,
} from "@/features/settings/preferences";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin", "latin-ext"], variable: "--font-sora", display: "swap" });
const notoSansSC = Noto_Sans_SC({ subsets: ["latin"], variable: "--font-noto-sans-sc", display: "swap" });
const sourceSerif4 = Source_Serif_4({ subsets: ["latin", "latin-ext"], variable: "--font-source-serif-4", display: "swap" });
const notoSerifSC = Noto_Serif_SC({ subsets: ["latin"], variable: "--font-noto-serif-sc", display: "swap" });

export const metadata: Metadata = {
  title: "Chinese Learning App",
  description: "A calm Chinese study workspace built with Next.js and Supabase.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { user, profile } = await getAuthContext();
  const { locale, messages } = await getServerI18n(profile?.preferredLanguage);
  const theme = normalizeThemePreference(profile?.preferredTheme);
  const font = normalizeFontPreference(profile?.preferredFont);

  return (
    <html
      lang={locale}
      data-theme-preference={theme}
      data-theme={theme === "system" ? "light" : theme}
      data-font-preference={font}
      suppressHydrationWarning
    >
      <body
        className={`${inter.variable} ${sora.variable} ${notoSansSC.variable} ${sourceSerif4.variable} ${notoSerifSC.variable} min-h-screen antialiased`}
      >
        <a
          href="#main-content"
          className="focus-ring sr-only fixed left-4 top-4 z-[100] rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground shadow-soft focus:not-sr-only"
        >
          {messages.header.skipToContent}
        </a>
        <PreferencesProvider language={locale} theme={theme} font={font} />
        <I18nProvider locale={locale} messages={messages}>
          <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-6 px-4 py-4 sm:px-5 lg:flex-row lg:px-6 lg:py-6">
            <AppSidebar user={user} />
            <div className="min-w-0 flex-1 space-y-6">
              <AppHeader user={user} />
              <main id="main-content" className="page-shell" tabIndex={-1}>
                {children}
              </main>
            </div>
          </div>
        </I18nProvider>
        <Toaster />
      </body>
    </html>
  );
}
