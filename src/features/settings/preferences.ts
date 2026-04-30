import type { Profile, PreferredFont, PreferredTheme } from "@/types/domain";

import type { SupportedLanguage, UserSettingsInput } from "@/features/settings/types";
import { localeLabels } from "@/i18n/config";
import {
  DEFAULT_LEARNING_SCHEDULER_SETTINGS,
  clampDesiredRetention,
  clampMaximumIntervalDays,
  getDefaultDailyGoal,
} from "@/features/memory/spaced-repetition";

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  return value === "vi" || value === "zh" ? value : "en";
}

export function normalizeThemePreference(
  value: string | null | undefined,
): PreferredTheme {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function normalizeFontPreference(
  value: string | null | undefined,
): PreferredFont {
  if (value === "serif") return "serif";
  if (value === "kai") return "kai";
  return "sans";
}

export function getInitialUserSettings(
  profile: Profile,
  learningSettings?: Partial<
    Pick<UserSettingsInput, "dailyGoal" | "schedulerType" | "desiredRetention" | "maximumIntervalDays">
  > | null,
): UserSettingsInput {
  return {
    language: normalizeLanguage(profile.preferredLanguage),
    theme: normalizeThemePreference(profile.preferredTheme),
    font: normalizeFontPreference(profile.preferredFont),
    dailyGoal: Math.max(1, Math.min(Math.round(learningSettings?.dailyGoal ?? getDefaultDailyGoal()), 200)),
    schedulerType: learningSettings?.schedulerType === "fsrs" ? "fsrs" : DEFAULT_LEARNING_SCHEDULER_SETTINGS.schedulerType,
    desiredRetention: clampDesiredRetention(learningSettings?.desiredRetention ?? DEFAULT_LEARNING_SCHEDULER_SETTINGS.desiredRetention),
    maximumIntervalDays: clampMaximumIntervalDays(
      learningSettings?.maximumIntervalDays ?? DEFAULT_LEARNING_SCHEDULER_SETTINGS.maximumIntervalDays,
    ),
  };
}

export function getLanguageLabel(language: SupportedLanguage) {
  return localeLabels[language];
}

export function getThemeLabel(theme: PreferredTheme) {
  if (theme === "light") return "Light";
  if (theme === "dark") return "Dark";
  return "System";
}

export function getFontLabel(font: PreferredFont) {
  if (font === "serif") return "Readable Serif";
  if (font === "kai") return "Kaiti Brush";
  return "Modern Sans";
}

export function getSchedulerLabel(schedulerType: UserSettingsInput["schedulerType"]) {
  return schedulerType === "fsrs" ? "FSRS" : "SM-2 / Anki-like";
}
