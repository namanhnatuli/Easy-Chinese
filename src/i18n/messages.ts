import en from "@/messages/en.json";
import vi from "@/messages/vi.json";
import zh from "@/messages/zh.json";
import type { AppLocale } from "@/i18n/config";

export type AppMessages = typeof en;

const messageCatalog: Record<AppLocale, AppMessages> = {
  en,
  vi,
  zh,
};

export async function getMessages(locale: AppLocale): Promise<AppMessages> {
  return messageCatalog[locale];
}
