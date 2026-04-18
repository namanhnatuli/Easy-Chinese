import type { Profile, PreferredFont, PreferredTheme } from "@/types/domain";

import type { SupportedLanguage, UserSettingsInput } from "@/features/settings/types";

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  return value === "en" ? "en" : "vi";
}

export function normalizeThemePreference(
  value: string | null | undefined,
): PreferredTheme {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function normalizeFontPreference(
  value: string | null | undefined,
): PreferredFont {
  return value === "serif" ? "serif" : "sans";
}

export function getInitialUserSettings(profile: Profile): UserSettingsInput {
  return {
    language: normalizeLanguage(profile.preferredLanguage),
    theme: normalizeThemePreference(profile.preferredTheme),
    font: normalizeFontPreference(profile.preferredFont),
  };
}

export function getLanguageLabel(language: SupportedLanguage) {
  return language === "vi" ? "Tiếng Việt" : "English-ready";
}

export function getThemeLabel(theme: PreferredTheme) {
  if (theme === "light") return "Light";
  if (theme === "dark") return "Dark";
  return "System";
}

export function getFontLabel(font: PreferredFont) {
  return font === "serif" ? "Readable Serif" : "Modern Sans";
}
