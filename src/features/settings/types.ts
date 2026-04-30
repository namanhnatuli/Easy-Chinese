import type { PreferredFont, PreferredTheme, SchedulerType, TtsProvider } from "@/types/domain";

export const supportedLanguages = ["en", "vi", "zh"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export interface UserSettingsInput {
  language: SupportedLanguage;
  theme: PreferredTheme;
  font: PreferredFont;
  ttsProvider: TtsProvider;
  ttsVoice: string;
  dailyGoal: number;
  schedulerType: SchedulerType;
  desiredRetention: number;
  maximumIntervalDays: number;
}
