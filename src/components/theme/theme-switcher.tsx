"use client";

import { Monitor, MoonStar, SunMedium } from "lucide-react";
import { useState } from "react";

import { dispatchPreferenceUpdate } from "@/components/settings/preferences-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  normalizeFontPreference,
  normalizeLanguage,
  normalizeThemePreference,
} from "@/features/settings/preferences";
import { useI18n } from "@/i18n/client";

import type { PreferredTheme } from "@/types/domain";

function ThemeIcon({ theme }: { theme: PreferredTheme }) {
  if (theme === "light") {
    return <SunMedium className="size-4" />;
  }

  if (theme === "dark") {
    return <MoonStar className="size-4" />;
  }

  return <Monitor className="size-4" />;
}

export function ThemeSwitcher({
  authenticated = false,
  initialTheme = "system",
}: {
  authenticated?: boolean;
  initialTheme?: PreferredTheme;
}) {
  const { t } = useI18n();
  const [theme, setTheme] = useState<PreferredTheme>(normalizeThemePreference(initialTheme));

  function applyTheme(nextTheme: PreferredTheme) {
    setTheme(nextTheme);

    const language = normalizeLanguage(document.documentElement.lang);
    const font = normalizeFontPreference(document.documentElement.dataset.fontPreference);

    dispatchPreferenceUpdate({
      language,
      theme: nextTheme,
      font,
    });

    if (authenticated) {
      fetch("/api/settings/theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ theme: nextTheme }),
      }).catch(console.error);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("settings.themeTitle")}
          className="rounded-xl"
        >
          <ThemeIcon theme={theme} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => applyTheme("light")}>
          <SunMedium className="mr-2 size-4" />
          {t("settings.light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyTheme("dark")}>
          <MoonStar className="mr-2 size-4" />
          {t("settings.dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyTheme("system")}>
          <Monitor className="mr-2 size-4" />
          {t("settings.system")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
