import { defaultLocale, locales, type AppLocale } from "@/i18n/config";

export function normalizeLocale(value: string | null | undefined): AppLocale {
  return locales.find((locale) => locale === value) ?? defaultLocale;
}

export function resolveRequestLocale({
  pathnameLocale,
  profileLocale,
  cookieLocale,
}: {
  pathnameLocale?: string | null;
  profileLocale?: string | null;
  cookieLocale?: string | null;
}) {
  if (pathnameLocale && locales.includes(pathnameLocale as AppLocale)) {
    return pathnameLocale as AppLocale;
  }

  if (profileLocale && locales.includes(profileLocale as AppLocale)) {
    return profileLocale as AppLocale;
  }

  if (cookieLocale && locales.includes(cookieLocale as AppLocale)) {
    return cookieLocale as AppLocale;
  }

  return defaultLocale;
}
