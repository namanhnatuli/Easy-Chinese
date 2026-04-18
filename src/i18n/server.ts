import { localizeHref } from "@/i18n/navigation";
import { getRequestConfig } from "@/i18n/request";
import { createTranslator } from "@/i18n/translate";

export async function getServerI18n(preferredLanguage?: string | null) {
  const { locale, messages } = await getRequestConfig(preferredLanguage);

  return {
    locale,
    messages,
    t: createTranslator(messages),
    link: (href: string) => localizeHref(href, locale),
  };
}
