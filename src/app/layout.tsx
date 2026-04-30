import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Inter,
  Noto_Sans_SC,
  Noto_Serif_SC,
  Lexend,
} from "next/font/google";

import "@/app/globals.css";

import { AppShell } from "@/components/layout/app-shell";
import { PreferencesProvider } from "@/components/settings/preferences-provider";
import { Toaster } from "@/components/ui/sonner";
import { getAuthContext } from "@/lib/auth";
import { I18nProvider } from "@/i18n/client";
import { getServerI18n } from "@/i18n/server";
import {
  normalizeFontPreference,
  normalizeThemePreference,
} from "@/features/settings/preferences";

const inter = Inter({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-inter", display: "swap" });
const lexend = Lexend({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-sora", display: "swap" });
const notoSansSC = Noto_Sans_SC({ weight: ["400", "500", "600", "700"], preload: false, variable: "--font-noto-sans-sc", display: "swap" });
const notoSerifSC = Noto_Serif_SC({ weight: ["400", "500", "600", "700"], preload: false, variable: "--font-noto-serif-sc", display: "swap" });

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
      className={`${inter.variable} ${lexend.variable} ${notoSansSC.variable} ${notoSerifSC.variable}`}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="min-h-screen antialiased"
      >
        <a
          href="#main-content"
          className="focus-ring sr-only fixed left-4 top-4 z-[100] rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground shadow-soft focus:not-sr-only"
        >
          {messages.header.skipToContent}
        </a>
        <PreferencesProvider language={locale} theme={theme} font={font} />
        <I18nProvider locale={locale} messages={messages}>
          <AppShell user={user} initialTheme={theme}>
            {children}
          </AppShell>
        </I18nProvider>
        <Toaster />
      </body>
    </html>
  );
}
