import type { PreferredFont, PreferredTheme } from "@/types/domain";

export const supportedLanguages = ["vi", "en"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export interface UserSettingsInput {
  language: SupportedLanguage;
  theme: PreferredTheme;
  font: PreferredFont;
}
