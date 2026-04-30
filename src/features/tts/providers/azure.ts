import { createTtsServiceError } from "@/features/tts/errors";
import type {
  TtsProviderClient,
  TtsSynthesisInput,
  TtsSynthesisResult,
} from "@/features/tts/providers/types";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildAzureSsml(input: TtsSynthesisInput) {
  return [
    `<speak version="1.0" xml:lang="${escapeXml(input.languageCode)}">`,
    `<voice name="${escapeXml(input.voice)}">`,
    `<prosody rate="${input.speakingRate}" pitch="${input.pitch}Hz">`,
    `${escapeXml(input.text)}`,
    "</prosody>",
    "</voice>",
    "</speak>",
  ].join("");
}

export interface AzureTtsProviderOptions {
  speechKey?: string;
  speechRegion?: string;
}

export class AzureTtsProvider implements TtsProviderClient {
  provider = "azure" as const;

  private speechKey?: string;
  private speechRegion?: string;

  constructor(options: AzureTtsProviderOptions) {
    this.speechKey = options.speechKey;
    this.speechRegion = options.speechRegion;
  }

  async synthesizeSpeech(input: TtsSynthesisInput): Promise<TtsSynthesisResult> {
    if (!this.speechKey || !this.speechRegion) {
      throw createTtsServiceError(
        "provider_not_configured",
        "Azure Speech credentials are not configured.",
      );
    }

    const response = await fetch(
      `https://${this.speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.speechKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
          "User-Agent": "chinese-learning-app/tts",
        },
        body: buildAzureSsml(input),
      },
    );

    if (response.status === 401 || response.status === 403) {
      throw createTtsServiceError(
        "provider_not_configured",
        "Azure Speech credentials were rejected.",
      );
    }

    if (response.status === 429) {
      throw createTtsServiceError(
        "quota_or_rate_limited",
        "Azure Speech quota or rate limit was reached.",
      );
    }

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw createTtsServiceError(
        "provider_failed",
        `Azure Speech synthesis failed with status ${response.status}.${details ? ` ${details}` : ""}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    if (audioBuffer.byteLength === 0) {
      throw createTtsServiceError(
        "provider_failed",
        "Azure Speech returned an empty audio payload.",
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
