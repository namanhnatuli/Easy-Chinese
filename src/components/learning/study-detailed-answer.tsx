import { Volume2 } from "lucide-react";

import { HanziWriterAnimator } from "@/components/shared/hanzi-writer-animator";
import { PronunciationButton } from "@/components/shared/pronunciation-button";
import type { FlashcardPrompt } from "@/features/learning/types";
import { useI18n } from "@/i18n/client";

export function StudyDetailedAnswer({
  details,
}: {
  details: FlashcardPrompt["back"];
}) {
  const { t } = useI18n();

  return (
    <div className="mt-6 space-y-4 text-left">
      <div className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">
          {t("learning.answer")}
        </p>

        <div className="flex flex-wrap gap-2">
          {details.hanzi.split("").map((char, i) => (
            <HanziWriterAnimator
              key={`${char}-${i}`}
              character={char}
              size={100}
            />
          ))}
        </div>

        <div>
          <div className="flex items-baseline gap-3">
            <p className="text-pinyin text-xl font-medium text-foreground">
              {details.pinyin}
            </p>
            <PronunciationButton
              text={details.hanzi}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              label={t("learning.detail.pronunciation")}
              hideIcon
              showErrorMessage={false}
            >
              <span className="sr-only">{t("learning.detail.pronunciation")}</span>
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            </PronunciationButton>
          </div>
          <p className="text-meaning mt-1 text-lg text-foreground">
            {details.vietnameseMeaning}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-muted/50 p-4 text-sm">
        {details.hanViet ? (
          <div>
            <span className="font-semibold text-foreground">{t("learning.detail.hanViet")}: </span>
            <span className="text-muted-foreground">{details.hanViet}</span>
          </div>
        ) : null}

        {details.mnemonic ? (
          <div>
            <span className="font-semibold text-foreground">{t("learning.detail.mnemonic")}: </span>
            <span className="text-muted-foreground">{details.mnemonic}</span>
          </div>
        ) : null}

        {details.notes ? (
          <div>
            <span className="font-semibold text-foreground">{t("learning.detail.notes")}: </span>
            <span className="text-muted-foreground">{details.notes}</span>
          </div>
        ) : null}

        <div className="text-xs text-muted-foreground/80">
          {t("learning.detail.simplified")}: {details.simplified} · {t("learning.detail.traditional")}:{" "}
          {details.traditional ?? "—"}
        </div>
      </div>

      {details.examples && details.examples.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">{t("learning.detail.examples")}</p>
          <ul className="space-y-3">
            {details.examples.map((ex) => (
              <li
                key={ex.id}
                className="rounded-xl border border-border/50 bg-card p-3 text-sm"
              >
                <p className="text-hanzi text-base text-foreground">
                  {ex.chineseText}
                </p>
                <div className="mt-2">
                  <PronunciationButton
                    text={ex.chineseText}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    label={t("learning.playExample")}
                  />
                </div>
                <p className="text-pinyin text-muted-foreground">{ex.pinyin}</p>
                <p className="text-meaning mt-1 text-muted-foreground">
                  {ex.vietnameseMeaning}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
