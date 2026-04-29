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
      className: "bg-amber-300 text-slate-950 hover:bg-amber-200",
    },
    {
      grade: "good",
      labelKey: "good",
      className: "bg-emerald-300 text-slate-950 hover:bg-emerald-200",
    },
    {
      grade: "easy",
      labelKey: "easy",
      className: "bg-sky-300 text-slate-950 hover:bg-sky-200",
    },
  ];

  return (
    <section className="rounded-[2rem] bg-slate-950 text-white">
      <div className="mb-6 flex items-center justify-between text-sm text-slate-300">
        <span>{t("learning.flashcard")}</span>
        <span>
          {currentIndex} / {total}
        </span>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{prompt.frontLabel}</p>
        <p className="text-hanzi mt-4 text-5xl">{prompt.frontText}</p>

        {revealed ? (
          <div className="mt-6 space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">{t("learning.answer")}</p>
            <p className="text-hanzi mt-1 text-emerald-100">{prompt.back.hanzi}</p>
            <p className="text-pinyin text-slate-200">{prompt.back.pinyin}</p>
            <p className="text-meaning text-slate-200">{prompt.back.vietnameseMeaning}</p>
            {prompt.back.hanViet ? (
              <p className="text-sm text-slate-400">Hán Việt: {prompt.back.hanViet}</p>
            ) : null}
            <p className="text-sm text-slate-400">
              Simplified: {prompt.back.simplified} · Traditional: {prompt.back.traditional ?? "—"}
            </p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-400">{t("learning.revealAnswer")}</p>
        )}
      </div>

      {feedback ? (
        <div
          className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200"
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
            className="bg-white text-slate-950 hover:bg-white/90"
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
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            {t("learning.nextWord")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
