import { cookies, headers } from "next/headers";

import {
  localeCookieName,
  localeHeaderName,
} from "@/i18n/config";
import { normalizeLocale, resolveRequestLocale } from "@/i18n/locale";
import { getMessages } from "@/i18n/messages";

export async function getRequestLocale(preferredLanguage?: string | null) {
  const headerList = await headers();
  const cookieStore = await cookies();

  return resolveRequestLocale({
    pathnameLocale: headerList.get(localeHeaderName),
    profileLocale: preferredLanguage,
    cookieLocale: cookieStore.get(localeCookieName)?.value,
  });
}

export async function getRequestConfig(preferredLanguage?: string | null) {
  const locale = await getRequestLocale(preferredLanguage);
  const messages = await getMessages(locale);

  return {
    locale,
    messages,
  };
}

export { normalizeLocale, resolveRequestLocale };
