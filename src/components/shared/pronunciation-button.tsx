"use client";

import type { ComponentProps, ReactNode } from "react";
import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function canUseSpeechSynthesis(text: string) {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined" &&
    text.trim().length > 0
  );
}

export function cancelSpeechSynthesis() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakText({
  text,
  lang = "zh-CN",
  rate,
}: {
  text: string;
  lang?: string;
  rate?: number;
}) {
  if (!canUseSpeechSynthesis(text)) {
    return false;
  }

  cancelSpeechSynthesis();
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  if (typeof rate === "number") {
    utterance.rate = rate;
  }
  window.speechSynthesis.speak(utterance);
  return true;
}

interface PronunciationButtonProps
  extends Omit<ComponentProps<typeof Button>, "onClick"> {
  text: string;
  lang?: string;
  rate?: number;
  label?: string;
  children?: ReactNode;
  hideIcon?: boolean;
  onUnsupported?: () => void;
}

export function PronunciationButton({
  text,
  lang = "zh-CN",
  rate,
  label,
  children,
  hideIcon = false,
  onUnsupported,
  disabled,
  title,
  ...buttonProps
}: PronunciationButtonProps) {
  const handleSpeak = () => {
    const didSpeak = speakText({ text, lang, rate });
    if (!didSpeak) {
      onUnsupported?.();
      return;
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleSpeak}
      disabled={disabled}
      title={title ?? label ?? "Phát âm"}
      {...buttonProps}
    >
      {children ?? (
        <>
          {!hideIcon ? <Volume2 className="mr-2 size-4" /> : null}
          {label ?? "Nghe"}
        </>
      )}
    </Button>
  );
}
