import { getTtsProviderDefaults, isSupportedTtsVoice } from "@/features/tts/catalog";
import { getTtsConfig } from "@/features/tts/config";
import { createTtsServiceError } from "@/features/tts/errors";
import { resolveTtsCacheRequest } from "@/features/tts/request";
import type { TtsProviderClient } from "@/features/tts/providers/types";
import type { TtsProvider, TtsResolveRequestInput } from "@/features/tts/schema";

export function validateTtsRequest(
  input: TtsResolveRequestInput,
  preferences?: {
    provider?: TtsProvider | null;
    voice?: string | null;
  },
) {
  const config = getTtsConfig();
  const resolved = resolveTtsCacheRequest(input, preferences);
  const providerDefaults = getTtsProviderDefaults(resolved.provider);

  if (resolved.characterCount === 0) {
    throw createTtsServiceError("invalid_input", "Text must not be empty.");
  }

  if (resolved.characterCount > config.maxCharactersPerRequest) {
    throw createTtsServiceError(
      "invalid_input",
      `Text exceeds the ${config.maxCharactersPerRequest} character TTS limit.`,
    );
  }

  if (!config.allowedLanguageCodes.includes(resolved.languageCode)) {
    throw createTtsServiceError(
      "invalid_input",
      `Unsupported TTS language code: ${resolved.languageCode}.`,
    );
  }

  if (!config.configuredProviders.includes(resolved.provider)) {
    throw createTtsServiceError(
      "provider_not_configured",
      `TTS provider '${resolved.provider}' is not configured on the server.`,
    );
  }

  if (!isSupportedTtsVoice(resolved.provider, resolved.voice)) {
    throw createTtsServiceError(
      "invalid_input",
      `Unsupported TTS voice '${resolved.voice}' for provider '${resolved.provider}'.`,
    );
  }

  if (resolved.languageCode !== providerDefaults.defaultLanguage) {
    throw createTtsServiceError(
      "invalid_input",
      `Provider '${resolved.provider}' currently supports ${providerDefaults.defaultLanguage} only.`,
    );
  }

  return resolved;
}

export function selectTtsProvider(
  providerName: "azure" | "google",
  registry: Record<"azure" | "google", TtsProviderClient>,
) {
  const provider = registry[providerName];

  if (!provider) {
    throw createTtsServiceError(
      "invalid_input",
      `Unsupported TTS provider: ${providerName}.`,
    );
  }

  return provider;
}
