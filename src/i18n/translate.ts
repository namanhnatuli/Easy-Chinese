import type { AppMessages } from "@/i18n/messages";

type Primitive = string | number;

type NestedKeyOf<TObject extends object> = {
  [TKey in keyof TObject & string]:
    TObject[TKey] extends object
      ? `${TKey}` | `${TKey}.${NestedKeyOf<TObject[TKey]>}`
      : `${TKey}`;
}[keyof TObject & string];

export type MessageKey = NestedKeyOf<AppMessages>;
export type TranslationValues = Record<string, Primitive>;

function resolveMessageValue(messages: AppMessages, key: string): string | null {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return null;
  }, messages);

  return typeof value === "string" ? value : null;
}

function interpolate(template: string, values?: TranslationValues) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function createTranslator(messages: AppMessages) {
  return (key: MessageKey, values?: TranslationValues) => {
    const template = resolveMessageValue(messages, key);
    return interpolate(template ?? key, values);
  };
}
