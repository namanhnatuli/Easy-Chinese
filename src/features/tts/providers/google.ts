import { createTtsServiceError } from "@/features/tts/errors";
import type {
  TtsProviderClient,
  TtsSynthesisInput,
  TtsSynthesisResult,
} from "@/features/tts/providers/types";

export interface GoogleTtsProviderOptions {
  apiKey?: string;
}

export class GoogleTtsProvider implements TtsProviderClient {
  provider = "google" as const;

  private apiKey?: string;

  constructor(options: GoogleTtsProviderOptions) {
    this.apiKey = options.apiKey;
  }

  async synthesizeSpeech(input: TtsSynthesisInput): Promise<TtsSynthesisResult> {
    if (!this.apiKey) {
      throw createTtsServiceError(
        "provider_not_configured",
        "Google TTS API key is not configured.",
      );
    }

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            text: input.text,
          },
          voice: {
            languageCode: input.languageCode,
            name: input.voice,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: input.speakingRate,
            pitch: input.pitch,
          },
        }),
      },
    );

    if (response.status === 401 || response.status === 403) {
      throw createTtsServiceError(
        "provider_not_configured",
        "Google TTS credentials were rejected.",
      );
    }

    if (response.status === 429) {
      throw createTtsServiceError(
        "quota_or_rate_limited",
        "Google TTS quota or rate limit was reached.",
      );
    }

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw createTtsServiceError(
        "provider_failed",
        `Google TTS synthesis failed with status ${response.status}.${details ? ` ${details}` : ""}`,
      );
    }

    const body = (await response.json()) as { audioContent?: string };

    if (!body.audioContent) {
      throw createTtsServiceError(
        "provider_failed",
        "Google TTS returned no audio content.",
      );
    }

    const audioBuffer = Buffer.from(body.audioContent, "base64");

    if (audioBuffer.byteLength === 0) {
      throw createTtsServiceError(
        "provider_failed",
        "Google TTS returned an empty audio payload.",
      );
    }

    return {
      audioBuffer,
      mimeType: "audio/mpeg",
      metadata: {
        provider: this.provider,
        voice: input.voice,
        languageCode: input.languageCode,
        characterCount: Array.from(input.text).length,
      },
    };
  }
}
