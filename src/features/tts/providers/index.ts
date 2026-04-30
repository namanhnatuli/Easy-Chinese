import { getServerEnv } from "@/lib/env";

import { AzureTtsProvider } from "@/features/tts/providers/azure";
import { GoogleTtsProvider } from "@/features/tts/providers/google";
import type { TtsProviderClient } from "@/features/tts/providers/types";

export function createTtsProviderRegistry() {
  const env = getServerEnv();

  return {
    azure: new AzureTtsProvider({
      speechKey: env.AZURE_SPEECH_KEY,
      speechRegion: env.AZURE_SPEECH_REGION,
    }),
    google: new GoogleTtsProvider({
      apiKey: env.GOOGLE_TTS_API_KEY,
    }),
  } satisfies Record<"azure" | "google", TtsProviderClient>;
}
