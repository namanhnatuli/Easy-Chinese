"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { comparePronunciation } from "@/features/practice/pronunciation";

declare global {
interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface SpeechRecognitionAlternativeLike {
  transcript?: string;
}

interface SpeechRecognitionResultLike {
  0?: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

export function PronunciationFeedback({
  expectedText,
}: {
  expectedText: string;
}) {
  const { t } = useI18n();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setSupported(false);
      return;
    }

    setSupported(true);
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const parts: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        parts.push(event.results[index]?.[0]?.transcript ?? "");
      }

      const value = parts.join(" ");
      setTranscript(value.trim());
    };
    recognition.onerror = () => {
      setListening(false);
      setLoading(false);
    };
    recognition.onend = () => {
      setListening(false);
      setLoading(false);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const comparison = useMemo(
    () =>
      transcript
        ? comparePronunciation({
            expected: expectedText,
            transcript,
          })
        : null,
    [expectedText, transcript],
  );

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }

    if (listening) {
      recognition.stop();
      return;
    }

    setTranscript("");
    setLoading(true);
    setListening(true);
    recognition.start();
  }

  if (!supported) {
    return (
      <div className="rounded-[1.25rem] border border-dashed bg-secondary/50 p-4 text-sm text-muted-foreground">
        {t("practice.reading.pronunciationUnsupported")}
      </div>
    );
  }

  return (
    <div className="rounded-[1.25rem] border bg-secondary/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("practice.reading.pronunciationTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("practice.reading.pronunciationDescription")}</p>
        </div>
        <Button
          type="button"
          variant={listening ? "secondary" : "outline"}
          onClick={toggleListening}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          {listening ? t("practice.reading.stopListening") : t("practice.reading.startListening")}
        </Button>
      </div>

      {comparison ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={comparison.isCorrect ? "default" : "secondary"}>
              {comparison.isCorrect ? t("practice.reading.pronunciationCorrect") : t("practice.reading.pronunciationNeedsWork")}
            </Badge>
            <Badge variant="outline">{Math.round(comparison.matchRatio * 100)}%</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("practice.reading.transcriptLabel")}: {comparison.transcript}
          </p>
          <div className="flex flex-wrap gap-2">
            {comparison.segments.map((segment, index) => (
              <span
                key={`${segment.character}-${index}`}
                className={segment.expected ? "rounded-lg bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400" : "rounded-lg bg-rose-500/10 px-2 py-1 text-rose-600 dark:text-rose-400"}
              >
                {segment.character}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
