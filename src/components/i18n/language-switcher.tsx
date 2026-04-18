"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  localeLabels,
  localeCookieName,
  localeStorageKey,
  type AppLocale,
} from "@/i18n/config";
import { replaceLocaleInPathname } from "@/i18n/navigation";
import { useI18n } from "@/i18n/client";
import { dispatchPreferenceUpdate } from "@/components/settings/preferences-provider";
import { normalizeFontPreference, normalizeThemePreference } from "@/features/settings/preferences";

export function LanguageSwitcher({
  authenticated = false,
  ariaLabel,
  onLocaleChange,
}: {
  authenticated?: boolean;
  ariaLabel?: string;
  onLocaleChange?: (locale: AppLocale) => void;
}) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function persistLocale(localeValue: AppLocale) {
    document.cookie = `${localeCookieName}=${localeValue}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.localStorage.setItem(localeStorageKey, localeValue);
  }

  function applyImmediateLocale(localeValue: AppLocale) {
    dispatchPreferenceUpdate({
      language: localeValue,
      theme: normalizeThemePreference(document.documentElement.dataset.themePreference),
      font: normalizeFontPreference(document.documentElement.dataset.fontPreference),
    });
  }

  function handleChange(nextLocale: string) {
    const localeValue = nextLocale as AppLocale;

    startTransition(async () => {
      persistLocale(localeValue);
      applyImmediateLocale(localeValue);
      onLocaleChange?.(localeValue);

      if (authenticated) {
        const response = await fetch("/api/i18n/locale", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ locale: localeValue }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          toast.error(body?.message ?? t("settings.languageSaveError"));
        }
      }

      const nextPathname = replaceLocaleInPathname(pathname, localeValue);
      const search = searchParams.toString();
      const nextHref = search ? `${nextPathname}?${search}` : nextPathname;

      router.replace(nextHref);
      router.refresh();
    });
  }

  return (
    <Select value={locale} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger aria-label={ariaLabel} className="min-w-[9.5rem]">
        <div className="flex items-center gap-2">
          <Languages className="size-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(localeLabels).map(([value]) => (
          <SelectItem key={value} value={value}>
            {t(`languages.${value}` as "languages.en")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
