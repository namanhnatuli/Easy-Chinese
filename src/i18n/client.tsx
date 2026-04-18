"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { AppLocale } from "@/i18n/config";
import type { AppMessages } from "@/i18n/messages";
import { localizeHref } from "@/i18n/navigation";
import { createTranslator, type MessageKey, type TranslationValues } from "@/i18n/translate";

interface I18nContextValue {
  locale: AppLocale;
  messages: AppMessages;
  t: (key: MessageKey, values?: TranslationValues) => string;
  link: (href: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: AppLocale;
  messages: AppMessages;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const t = createTranslator(messages);

    return {
      locale,
      messages,
      t,
      link: (href: string) => localizeHref(href, locale),
    };
  }, [locale, messages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return context;
}
