"use client";

import { useEffect } from "react";

import {
  normalizeFontPreference,
  normalizeLanguage,
  normalizeThemePreference,
} from "@/features/settings/preferences";
import type { SupportedLanguage } from "@/features/settings/types";
import type { PreferredFont, PreferredTheme } from "@/types/domain";

function resolveTheme(theme: PreferredTheme) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return theme;
}

function applyPreferences({
  language,
  theme,
  font,
}: {
  language: SupportedLanguage;
  theme: PreferredTheme;
  font: PreferredFont;
}) {
  const root = document.documentElement;
  const resolvedTheme = resolveTheme(theme);

  root.lang = language;
  root.dataset.themePreference = theme;
  root.dataset.theme = resolvedTheme;
  root.dataset.fontPreference = font;
  root.style.colorScheme = resolvedTheme;
}

export function dispatchPreferenceUpdate(args: {
  language: SupportedLanguage;
  theme: PreferredTheme;
  font: PreferredFont;
}) {
  applyPreferences(args);
  window.dispatchEvent(new CustomEvent("app:preferences-updated", { detail: args }));
}

export function PreferencesProvider({
  language,
  theme,
  font,
}: {
  language: string;
  theme: string;
  font: string;
}) {
  const normalizedLanguage = normalizeLanguage(language);
  const normalizedTheme = normalizeThemePreference(theme);
  const normalizedFont = normalizeFontPreference(font);

  useEffect(() => {
    applyPreferences({
      language: normalizedLanguage,
      theme: normalizedTheme,
      font: normalizedFont,
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handlePreferenceUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{
        language: SupportedLanguage;
        theme: PreferredTheme;
        font: PreferredFont;
      }>).detail;

      if (detail) {
        applyPreferences(detail);
      }
    };
    const handleMediaChange = () => {
      const currentTheme = normalizeThemePreference(
        document.documentElement.dataset.themePreference,
      );
      const currentLanguage = normalizeLanguage(document.documentElement.lang);
      const currentFont = normalizeFontPreference(
        document.documentElement.dataset.fontPreference,
      );

      applyPreferences({
        language: currentLanguage,
        theme: currentTheme,
        font: currentFont,
      });
    };

    window.addEventListener("app:preferences-updated", handlePreferenceUpdate);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleMediaChange);
    } else {
      media.addListener(handleMediaChange);
    }

    return () => {
      window.removeEventListener("app:preferences-updated", handlePreferenceUpdate);
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", handleMediaChange);
      } else {
        media.removeListener(handleMediaChange);
      }
    };
  }, [normalizedFont, normalizedLanguage, normalizedTheme]);

  return null;
}
