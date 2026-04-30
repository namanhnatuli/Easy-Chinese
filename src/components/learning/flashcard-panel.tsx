"use client";

import { Volume2 } from "lucide-react";

import { PronunciationButton } from "@/components/shared/pronunciation-button";
import { Button } from "@/components/ui/button";
import { StudyDetailedAnswer } from "@/components/learning/study-detailed-answer";
import type { FlashcardPrompt, StudyFeedback } from "@/features/learning/types";
import type { SchedulerGrade } from "@/types/domain";
import { useI18n } from "@/i18n/client";

export function FlashcardPanel({
  prompt,
  currentIndex,
  total,
  revealed,
  feedback,
  dueHints,
  onReveal,
  onGrade,
  onNext,
}: {
  prompt: FlashcardPrompt;
  currentIndex: number;
  total: number;
  revealed: boolean;
  feedback: StudyFeedback | null;
  dueHints?: Partial<Record<SchedulerGrade, string>>;
  onReveal: () => void;
  onGrade: (grade: SchedulerGrade) => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const isLocked = feedback !== null;
  const gradeButtons: Array<{
    grade: SchedulerGrade;
    labelKey: "again" | "hard" | "good" | "easy";
    className: string;
  }> = [
    {
      grade: "again",
      labelKey: "again",
      className: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-900/30 dark:text-slate-200 dark:hover:bg-slate-900/50",
    },
    {
      grade: "hard",
      labelKey: "hard",
      className: "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50",
    },
    {
      grade: "good",
      labelKey: "good",
      className: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50",
    },
    {
      grade: "easy",
      labelKey: "easy",
      className: "bg-sky-100 text-sky-900 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:hover:bg-sky-900/50",
    },
  ];

  return (
    <section>
      <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>{t("learning.flashcard")}</span>
        <span>
          {currentIndex} / {total}
        </span>
      </div>

      <div className="rounded-[1.5rem] border bg-card p-8 text-center shadow-sm">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">{prompt.frontLabel}</p>
        <div className="mt-4 flex flex-col items-center gap-4">
          <p className="text-hanzi text-5xl">{prompt.frontText}</p>
          {!revealed ? (
            <PronunciationButton
              text={prompt.back.hanzi}
              variant="outline"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Volume2 className="mr-2 h-4 w-4" />
              Nghe phát âm
            </PronunciationButton>
          ) : null}
        </div>

        {revealed ? (
          <StudyDetailedAnswer details={prompt.back} />
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">{t("learning.revealAnswer")}</p>
        )}
      </div>

      {feedback ? (
        <div
          className="mt-5 rounded-2xl border bg-secondary/50 p-4 text-sm text-foreground"
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {!revealed ? (
          <Button
            onClick={onReveal}
            variant="secondary"
            disabled={isLocked}
          >
            {t("learning.revealAnswer")}
          </Button>
        ) : (
          <>
            {gradeButtons.map((button) => (
              <Button
                key={button.grade}
                onClick={() => onGrade(button.grade)}
                variant={button.grade === "again" ? "outline" : "secondary"}
                className={`min-w-[8rem] flex-1 sm:flex-none ${button.className}`}
                disabled={isLocked}
              >
                <span className="flex flex-col items-center leading-tight">
                  <span>{t(`learning.grades.${button.labelKey}`)}</span>
                  {dueHints?.[button.grade] ? (
                    <span className="text-[0.68rem] font-medium opacity-80">{dueHints[button.grade]}</span>
                  ) : null}
                </span>
              </Button>
            ))}
          </>
        )}

        {feedback ? (
          <Button
            onClick={onNext}
            variant="outline"
          >
            {t("learning.nextWord")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
