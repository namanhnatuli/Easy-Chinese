"use client";

import { FormEvent } from "react";

import { StudyDetailedAnswer } from "@/components/learning/study-detailed-answer";
import { Button } from "@/components/ui/button";
import type { StudyFeedback, TypingStudyQuestion } from "@/features/learning/types";
import { useI18n } from "@/i18n/client";

export function TypingPanel({
  question,
  currentIndex,
  total,
  value,
  feedback,
  onChange,
  onSubmit,
  onSkip,
  onNext,
}: {
  question: TypingStudyQuestion;
  currentIndex: number;
  total: number;
  value: string;
  feedback: StudyFeedback | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const isLocked = feedback !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLocked) {
      onNext();
      return;
    }

    onSubmit();
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>{t("learning.typing")}</span>
        <span>
          {currentIndex} / {total}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-[1.5rem] border bg-card p-8 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
            {question.variant === "meaning_to_pinyin"
              ? t("learning.meaningToPinyin")
              : question.variant === "pinyin_to_hanzi"
                ? t("learning.pinyinToChinese")
                : t("learning.meaningToHanzi")}
          </p>
          <p className="mt-4 text-2xl font-semibold">{question.prompt}</p>
        </div>

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={question.placeholder}
          aria-label={t("learning.typeYourAnswer")}
          aria-describedby={question.hint ? "typing-question-hint" : undefined}
          disabled={isLocked}
          className="w-full rounded-2xl border bg-background px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-500"
        />


        {feedback ? (
          <div className="space-y-4">
            <div
              className="rounded-2xl border bg-secondary/50 p-4 text-sm text-foreground"
              role="status"
              aria-live="polite"
            >
              <p>{feedback.message}</p>
            </div>

            {question.detailedAnswer ? (
              <StudyDetailedAnswer details={question.detailedAnswer} />
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {!feedback ? (
            <>
              <Button type="submit" variant="secondary">
                {t("learning.checkAnswer")}
              </Button>
              <Button
                type="button"
                onClick={onSkip}
                variant="outline"
                disabled={isLocked}
              >
                {t("learning.skip")}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={onNext}
              variant="outline"
            >
              {t("learning.nextWord")}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
