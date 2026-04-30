import type { TtsProvider } from "@/features/tts/schema";

export interface TtsSynthesisInput {
  text: string;
  languageCode: string;
  voice: string;
  speakingRate: number;
  pitch: number;
}

export interface TtsSynthesisResult {
  audioBuffer: Buffer;
  mimeType: string;
  metadata: {
    provider: TtsProvider;
    voice: string;
    languageCode: string;
    characterCount: number;
  };
}

export interface TtsProviderClient {
  provider: TtsProvider;
  synthesizeSpeech(input: TtsSynthesisInput): Promise<TtsSynthesisResult>;
}
