"use client";

import { Button } from "@/components/ui/button";
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
      className: "border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white",
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
        <p className="text-hanzi mt-4 text-5xl">{prompt.frontText}</p>

        {revealed ? (
          <div className="mt-6 space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">{t("learning.answer")}</p>
            <p className="text-hanzi mt-1 text-emerald-700 dark:text-emerald-300">{prompt.back.hanzi}</p>
            <p className="text-pinyin text-foreground">{prompt.back.pinyin}</p>
            <p className="text-meaning text-foreground">{prompt.back.vietnameseMeaning}</p>
            {prompt.back.hanViet ? (
              <p className="text-sm text-muted-foreground">Hán Việt: {prompt.back.hanViet}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Simplified: {prompt.back.simplified} · Traditional: {prompt.back.traditional ?? "—"}
            </p>
          </div>
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
