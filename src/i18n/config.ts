export const locales = ["en", "vi", "zh"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";
export const localeCookieName = "app-locale";
export const localeStorageKey = "app.locale";
export const localeHeaderName = "x-app-locale";

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
};
