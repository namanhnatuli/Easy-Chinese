"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef } from "react";
import { Loader2, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTtsAudio, type TtsAudioRequestInput } from "@/features/tts/use-tts-audio";
import { useI18n } from "@/i18n/client";

interface PronunciationButtonProps
  extends Omit<ComponentProps<typeof Button>, "onClick"> {
  text: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  voice?: string;
  provider?: "azure" | "google";
  label?: string;
  children?: ReactNode;
  hideIcon?: boolean;
  onUnsupported?: () => void;
  showErrorMessage?: boolean;
}

export const PronunciationButton = forwardRef<HTMLButtonElement, PronunciationButtonProps>(function PronunciationButton({
  text,
  lang = "zh-CN",
  rate,
  pitch,
  voice,
  provider,
  label,
  children,
  hideIcon = false,
  onUnsupported,
  showErrorMessage = true,
  disabled,
  title,
  ...buttonProps
}: PronunciationButtonProps, ref) {
  const { t } = useI18n();
  const { cacheHit, error, isLoading, play } = useTtsAudio();

  const playLabel = label ?? t("tts.playPronunciation");
  const loadingLabel = t("tts.loadingAudio");
  const errorLabel = t("tts.cannotPlayAudio");
  const isIconButton = buttonProps.size === "icon";
  const isDevelopment = process.env.NODE_ENV === "development";
  const debugCacheState = isDevelopment && cacheHit !== null
    ? cacheHit
      ? "cache-hit"
      : "cache-miss"
    : null;
  const resolvedTitle = title ?? playLabel;
  const buttonTitle = debugCacheState ? `${resolvedTitle} · ${debugCacheState}` : resolvedTitle;

  const handleSpeak = async () => {
    const played = await play({
      text,
      languageCode: lang,
      voice,
      provider,
      speakingRate: rate,
      pitch,
    } satisfies TtsAudioRequestInput);

    if (!played) {
      onUnsupported?.();
    }
  };

  const button = (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleSpeak()}
      disabled={disabled || isLoading}
      title={buttonTitle}
      data-cache-hit={debugCacheState ?? undefined}
      {...buttonProps}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {!isIconButton ? loadingLabel : <span className="sr-only">{loadingLabel}</span>}
        </>
      ) : children ?? (
        <>
          {!hideIcon ? <Volume2 className="size-4" /> : null}
          {playLabel}
        </>
      )}
    </Button>
  );

  if (!showErrorMessage || !error) {
    return button;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {button}
      <p className="text-xs text-destructive" role="status" aria-live="polite">
        {errorLabel}
      </p>
    </div>
  );
});
