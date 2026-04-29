"use client";

import { StudyDetailedAnswer } from "@/components/learning/study-detailed-answer";
import { Button } from "@/components/ui/button";
import type {
  MultipleChoiceStudyQuestion,
  StudyFeedback,
} from "@/features/learning/types";
import { useI18n } from "@/i18n/client";

export function MultipleChoicePanel({
  question,
  currentIndex,
  total,
  selectedChoice,
  feedback,
  onSelect,
  onSubmit,
  onSkip,
  onNext,
}: {
  question: MultipleChoiceStudyQuestion;
  currentIndex: number;
  total: number;
  selectedChoice: string | null;
  feedback: StudyFeedback | null;
  onSelect: (choice: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const isLocked = feedback !== null;

  return (
    <section>
      <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>{t("learning.multipleChoice")}</span>
        <span>
          {currentIndex} / {total}
        </span>
      </div>

      <div className="space-y-5 rounded-[1.5rem] border bg-card p-8 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
            {question.variant === "hanzi_to_meaning"
              ? t("learning.hanziToMeaning")
              : t("learning.meaningToHanzi")}
          </p>
          <p className="mt-4 text-4xl font-semibold">{question.prompt}</p>
        </div>

        <div
          className="grid gap-3"
          role="radiogroup"
          aria-label="Multiple choice answers"
        >
          {question.choices.map((choice, index) => {
            const active = selectedChoice === choice;

            return (
              <button
                key={choice}
                type="button"
                onClick={() => onSelect(choice)}
                role="radio"
                aria-checked={active}
                aria-disabled={isLocked}
                disabled={isLocked}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                  active
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                <span className="mr-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {index + 1}
                </span>
                {choice}
              </button>
            );
          })}
        </div>

        {feedback ? (
          <div className="space-y-4">
            <div
              className="rounded-2xl border bg-secondary/50 p-4 text-sm text-foreground"
              role="status"
              aria-live="polite"
            >
              <p>{feedback.message}</p>
              <p className="mt-2 text-muted-foreground">{question.explanation}</p>
            </div>
            
            {question.detailedAnswer ? (
              <StudyDetailedAnswer details={question.detailedAnswer} />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {!feedback ? (
          <>
            <Button
              onClick={onSubmit}
              variant="secondary"
              disabled={!selectedChoice}
            >
              {t("learning.checkAnswer")}
            </Button>
            <Button
              onClick={onSkip}
              variant="outline"
            >
              {t("learning.skip")}
            </Button>
          </>
        ) : (
          <Button
            onClick={onNext}
            variant="outline"
          >
            {t("learning.nextWord")}
          </Button>
        )}
      </div>
    </section>
  );
}
