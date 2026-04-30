import { ttsProviderSchema, type TtsProvider } from "@/features/tts/schema";

const PROVIDER_DEFAULTS = {
  azure: {
    defaultLanguage: "zh-CN",
    defaultVoice: "zh-CN-XiaoxiaoNeural",
    supportedVoices: ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"] as const,
  },
  google: {
    defaultLanguage: "zh-CN",
    defaultVoice: "cmn-CN-Standard-A",
    supportedVoices: ["cmn-CN-Standard-A", "cmn-CN-Standard-B", "cmn-CN-Wavenet-A"] as const,
  },
} satisfies Record<
  TtsProvider,
  {
    defaultLanguage: string;
    defaultVoice: string;
    supportedVoices: readonly string[];
  }
>;

const SUPPORTED_LANGUAGE_CODES = ["zh-CN"] as const;

export interface TtsProviderDefaults {
  defaultLanguage: string;
  defaultVoice: string;
  supportedVoices: readonly string[];
}

export function getSupportedTtsProviders() {
  return ttsProviderSchema.options;
}

export function getTtsProviderDefaults(provider: TtsProvider): TtsProviderDefaults {
  return PROVIDER_DEFAULTS[provider];
}

export function getSupportedTtsLanguageCodes() {
  return [...SUPPORTED_LANGUAGE_CODES];
}

export function isSupportedTtsLanguageCode(languageCode: string) {
  return SUPPORTED_LANGUAGE_CODES.includes(languageCode as (typeof SUPPORTED_LANGUAGE_CODES)[number]);
}

export function getSupportedTtsVoices(provider: TtsProvider) {
  return [...PROVIDER_DEFAULTS[provider].supportedVoices] as string[];
}

export function isSupportedTtsVoice(provider: TtsProvider, voice: string) {
  return getSupportedTtsVoices(provider).some((candidate) => candidate === voice);
}
