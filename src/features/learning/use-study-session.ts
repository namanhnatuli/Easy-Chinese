"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";

import { evaluateMultipleChoiceAnswer, evaluateTypingAnswer } from "@/features/learning/evaluation";
import { mapMemoryGradeToReviewResult } from "@/features/memory/spaced-repetition";
import {
  buildFlashcardPrompt,
  buildMultipleChoiceQuestion,
  buildTypingQuestion,
} from "@/features/learning/session";
import type { LessonStudyWord, StudyFeedback } from "@/features/learning/types";
import type { ReviewMode, ReviewResult, SchedulerGrade } from "@/types/domain";

type SessionMode = ReviewMode;

export function useStudySession<TWord extends LessonStudyWord>({
  items,
  onPersistOutcome,
  incorrectMessage = "Marked for more review.",
  flashcardMessages,
}: {
  items: TWord[];
  onPersistOutcome: (args: {
    currentItem: TWord;
    result: ReviewResult;
    grade?: SchedulerGrade;
    mode: SessionMode;
    nextCompletionPercent: number;
  }) => Promise<void>;
  incorrectMessage?: string;
  flashcardMessages?: Partial<Record<SchedulerGrade, string>>;
}) {
  const [mode, setMode] = useState<SessionMode>("flashcard");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [typingValue, setTypingValue] = useState("");
  const [feedback, setFeedback] = useState<StudyFeedback | null>(null);
  const [answered, setAnswered] = useState<Record<string, ReviewResult>>({});
  const [isSaving, startSaving] = useTransition();

  const totalItems = items.length;
  const currentItem = items[index] ?? null;
  const completionPercent =
    totalItems === 0 ? 0 : Math.round((Object.keys(answered).length / totalItems) * 100);

  const flashcardPrompt = currentItem ? buildFlashcardPrompt(currentItem, index) : null;
  const multipleChoiceQuestion = currentItem ? buildMultipleChoiceQuestion(items, index) : null;
  const typingQuestion = currentItem ? buildTypingQuestion(items, index) : null;

  useEffect(() => {
    setRevealed(false);
    setSelectedChoice(null);
    setTypingValue("");
    setFeedback(null);
  }, [index, mode]);

  const persistOutcome = useEffectEvent(
    async (result: ReviewResult, activeMode: SessionMode, grade?: SchedulerGrade) => {
    if (!currentItem) {
      return;
    }

    const nextCompletionPercent = Math.round(
      ((Object.keys(answered).length + (answered[currentItem.id] ? 0 : 1)) / totalItems) * 100,
    );

    await onPersistOutcome({
      currentItem,
      result,
      grade,
      mode: activeMode,
      nextCompletionPercent,
    });
    },
  );

  const handleOutcome = useEffectEvent((result: ReviewResult, message: string, grade?: SchedulerGrade) => {
    if (!currentItem) {
      return;
    }

    setFeedback({ result, message });
    setAnswered((previous) => ({
      ...previous,
      [currentItem.id]: result,
    }));

    startSaving(() => {
      void persistOutcome(result, mode, grade);
    });
  });

  const goToNextItem = useEffectEvent(() => {
    setIndex((current) => Math.min(current + 1, totalItems));
  });

  const handleFlashcardGrade = useEffectEvent((grade: SchedulerGrade) => {
    if (feedback) {
      return;
    }

    const result = mapMemoryGradeToReviewResult(grade);
    const message = (() => {
      switch (grade) {
        case "again":
          return flashcardMessages?.again ?? incorrectMessage;
        case "hard":
          return flashcardMessages?.hard ?? "Marked as hard.";
        case "good":
          return flashcardMessages?.good ?? "Marked as good.";
        case "easy":
          return flashcardMessages?.easy ?? "Marked as easy.";
      }
    })();

    handleOutcome(result, message, grade);
  });

  const handleMultipleChoiceSubmit = useEffectEvent(() => {
    if (feedback || !multipleChoiceQuestion) {
      return;
    }

    const evaluation = evaluateMultipleChoiceAnswer(
      multipleChoiceQuestion,
      selectedChoice,
    );

    if (!selectedChoice) {
      setFeedback({
        result: "skipped",
        message: evaluation.feedback,
      });
      return;
    }

    handleOutcome(
      evaluation.isCorrect ? "correct" : "incorrect",
      evaluation.feedback,
    );
  });

  const handleTypingSubmit = useEffectEvent(() => {
    if (feedback || !typingQuestion) {
      return;
    }

    const evaluation = evaluateTypingAnswer(typingQuestion, typingValue);

    if (!typingValue.trim()) {
      setFeedback({
        result: "skipped",
        message: evaluation.feedback,
      });
      return;
    }

    handleOutcome(
      evaluation.isCorrect ? "correct" : "incorrect",
      evaluation.feedback,
    );
  });

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!currentItem) {
      return;
    }

    const activeElement = document.activeElement;
    const isTypingIntoInput =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement;

    if (mode === "flashcard" && !isTypingIntoInput) {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (!revealed) {
          setRevealed(true);
        } else if (feedback) {
          goToNextItem();
        }
      }

      if (event.key === "1") {
        event.preventDefault();
        if (!feedback) {
          handleFlashcardGrade("again");
        }
      }

      if (event.key === "2") {
        event.preventDefault();
        if (!feedback) {
          handleFlashcardGrade("hard");
        }
      }

      if (event.key === "3") {
        event.preventDefault();
        if (!feedback) {
          handleFlashcardGrade("good");
        }
      }

      if (event.key === "4") {
        event.preventDefault();
        if (!feedback) {
          handleFlashcardGrade("easy");
        }
      }
    }

    if (mode === "multiple_choice" && !isTypingIntoInput && multipleChoiceQuestion) {
      const indexFromKey = Number(event.key) - 1;

      if (indexFromKey >= 0 && indexFromKey < multipleChoiceQuestion.choices.length) {
        event.preventDefault();
        setSelectedChoice(multipleChoiceQuestion.choices[indexFromKey]);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (feedback) {
          goToNextItem();
        } else {
          handleMultipleChoiceSubmit();
        }
      }
    }

    if (mode === "typing" && event.key === "Enter") {
      if (feedback && !isTypingIntoInput) {
        event.preventDefault();
        goToNextItem();
      }
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const summaryValues = Object.values(answered);
  const summary = {
    correct: summaryValues.filter((result) => result === "correct").length,
    incorrect: summaryValues.filter((result) => result === "incorrect").length,
    skipped: summaryValues.filter((result) => result === "skipped").length,
  };

  return {
    mode,
    setMode,
    index,
    setIndex,
    totalItems,
    currentItem,
    completionPercent,
    revealed,
    setRevealed,
    selectedChoice,
    setSelectedChoice,
    typingValue,
    setTypingValue,
    feedback,
    setFeedback,
    answered,
    setAnswered,
    isSaving,
    flashcardPrompt,
    multipleChoiceQuestion,
    typingQuestion,
    summary,
    handleOutcome,
    handleFlashcardGrade,
    handleMultipleChoiceSubmit,
    handleTypingSubmit,
    goToNextItem,
  };
}
