"use client";

import { useEffect, useRef, useState } from "react";

export interface TtsAudioRequestInput {
  text: string;
  languageCode?: string;
  voice?: string;
  provider?: "azure" | "google";
  speakingRate?: number;
  pitch?: number;
}

interface TtsAudioResponse {
  audioUrl: string;
  cacheHit: boolean;
  cacheKey: string;
  mimeType: string;
  characterCount: number;
}

type ManagedAudioElement = HTMLAudioElement & {
  __ttsRequestKey?: string;
};

const sessionAudioCache = new Map<string, TtsAudioResponse>();
const inflightAudioRequests = new Map<string, Promise<TtsAudioResponse>>();

function buildRequestKey({
  text,
  languageCode = "zh-CN",
  voice,
  provider,
  speakingRate,
  pitch,
}: TtsAudioRequestInput) {
  return JSON.stringify({
    text: text.trim(),
    languageCode,
    voice: voice ?? null,
    provider: provider ?? null,
    speakingRate: speakingRate ?? null,
    pitch: pitch ?? null,
  });
}

async function fetchTtsAudio(input: TtsAudioRequestInput) {
  const trimmedText = input.text.trim();

  if (trimmedText.length === 0) {
    throw new Error("invalid_tts_text");
  }

  const requestKey = buildRequestKey({
    ...input,
    text: trimmedText,
  });

  const cached = sessionAudioCache.get(requestKey);
  if (cached) {
    return cached;
  }

  const inflight = inflightAudioRequests.get(requestKey);
  if (inflight) {
    return inflight;
  }

  const requestPromise = (async () => {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: trimmedText,
        languageCode: input.languageCode ?? "zh-CN",
        voice: input.voice,
        provider: input.provider,
        speakingRate: input.speakingRate,
        pitch: input.pitch,
      }),
    });

    if (!response.ok) {
      throw new Error("tts_request_failed");
    }

    const payload = (await response.json()) as Partial<TtsAudioResponse>;
    if (!payload.audioUrl || !payload.cacheKey) {
      throw new Error("tts_response_invalid");
    }

    const resolved: TtsAudioResponse = {
      audioUrl: payload.audioUrl,
      cacheHit: payload.cacheHit ?? false,
      cacheKey: payload.cacheKey,
      mimeType: payload.mimeType ?? "audio/mpeg",
      characterCount: payload.characterCount ?? trimmedText.length,
    };

    sessionAudioCache.set(requestKey, resolved);

    return resolved;
  })();

  inflightAudioRequests.set(requestKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inflightAudioRequests.delete(requestKey);
  }
}

function stopAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;
}

export async function prefetchTtsAudio(input: TtsAudioRequestInput) {
  try {
    await fetchTtsAudio(input);
  } catch {
    // Prefetch is opportunistic and should not surface errors into the UI.
  }
}

export function useTtsAudio() {
  const audioRef = useRef<ManagedAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);

  useEffect(() => {
    return () => {
      stopAudio(audioRef.current);
      audioRef.current = null;
    };
  }, []);

  const stop = () => {
    stopAudio(audioRef.current);
  };

  const play = async (input: TtsAudioRequestInput) => {
    if (isLoading) {
      return false;
    }

    const requestKey = buildRequestKey(input);
    setIsLoading(true);
    setError(null);

    try {
      const payload = await fetchTtsAudio(input);
      let audio = audioRef.current;

      if (!audio || audio.__ttsRequestKey !== requestKey || audio.src !== payload.audioUrl) {
        stopAudio(audio);
        audio = new Audio(payload.audioUrl) as ManagedAudioElement;
        audio.__ttsRequestKey = requestKey;
        audioRef.current = audio;
      } else {
        audio.currentTime = 0;
      }

      setAudioUrl(payload.audioUrl);
      setCacheHit(payload.cacheHit);
      await audio.play();

      return true;
    } catch {
      setError("cannot_play_audio");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    audioUrl,
    cacheHit,
    error,
    isLoading,
    play,
    stop,
  };
}
