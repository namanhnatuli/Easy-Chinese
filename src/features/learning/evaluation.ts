import type {
  MultipleChoiceStudyQuestion,
  TypingStudyQuestion,
} from "@/features/learning/types";

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeChineseText(value: string) {
  return normalizeWhitespace(value).replace(/\s+/g, "");
}

function normalizePinyin(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function evaluateMultipleChoiceAnswer(
  question: MultipleChoiceStudyQuestion,
  selectedChoice: string | null,
) {
  if (!selectedChoice) {
    return {
      isCorrect: false,
      feedback: "Choose an answer first.",
    };
  }

  const isCorrect = selectedChoice === question.correctChoice;

  return {
    isCorrect,
    feedback: isCorrect
      ? "Correct answer."
      : `Correct answer: ${question.correctChoice}`,
  };
}

export function evaluateTypingAnswer(
  question: TypingStudyQuestion,
  value: string,
) {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      isCorrect: false,
      feedback: "Type an answer before checking.",
    };
  }

  const normalize =
    question.variant === "meaning_to_pinyin"
      ? normalizePinyin
      : normalizeChineseText;

  const normalizedValue = normalize(trimmed);
  const isCorrect = question.acceptedAnswers.some(
    (answer) => normalize(answer) === normalizedValue,
  );

  return {
    isCorrect,
    feedback: isCorrect
      ? "Correct."
      : `Accepted answer: ${question.acceptedAnswers[0]}`,
  };
}
