import type { ListeningDictationResult, ListeningEvaluationResult } from "@/features/listening/types";

const punctuationPattern = /[\p{P}\p{S}]/gu;
const whitespacePattern = /\s+/gu;

function toCharacters(value: string) {
  return Array.from(value);
}

function getLevenshteinDistance(left: string, right: string) {
  const leftChars = toCharacters(left);
  const rightChars = toCharacters(right);

  if (leftChars.length === 0) {
    return rightChars.length;
  }

  if (rightChars.length === 0) {
    return leftChars.length;
  }

  const previous = Array.from({ length: rightChars.length + 1 }, (_, index) => index);
  const current = new Array<number>(rightChars.length + 1).fill(0);

  for (let leftIndex = 0; leftIndex < leftChars.length; leftIndex += 1) {
    current[0] = leftIndex + 1;

    for (let rightIndex = 0; rightIndex < rightChars.length; rightIndex += 1) {
      const substitutionCost = leftChars[leftIndex] === rightChars[rightIndex] ? 0 : 1;
      current[rightIndex + 1] = Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + substitutionCost,
      );
    }

    for (let index = 0; index < current.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[rightChars.length] ?? 0;
}

export function normalizeListeningAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(whitespacePattern, "")
    .replace(punctuationPattern, "");
}

function resolveListeningResult(score: number): ListeningDictationResult {
  if (score >= 1) {
    return "correct";
  }

  if (score >= 0.8) {
    return "almost";
  }

  return "incorrect";
}

export function evaluateListeningDictationAnswer({
  expected,
  answer,
  hintUsed = false,
}: {
  expected: string;
  answer: string;
  hintUsed?: boolean;
}): ListeningEvaluationResult {
  const normalizedExpected = normalizeListeningAnswer(expected);
  const normalizedAnswer = normalizeListeningAnswer(answer);

  if (!normalizedExpected) {
    return {
      result: "incorrect",
      score: 0,
      normalizedExpected,
      normalizedAnswer,
    };
  }

  const distance = getLevenshteinDistance(normalizedExpected, normalizedAnswer);
  const maxLength = Math.max(toCharacters(normalizedExpected).length, toCharacters(normalizedAnswer).length, 1);
  const score = Math.max(0, Number((1 - distance / maxLength).toFixed(4)));
  let result = resolveListeningResult(score);

  // Using hints downgrades an exact answer to almost-correct for XP/progress purposes.
  if (hintUsed && result === "correct") {
    result = "almost";
  }

  return {
    result,
    score,
    normalizedExpected,
    normalizedAnswer,
    diff: {
      distance,
      expectedLength: toCharacters(normalizedExpected).length,
      answerLength: toCharacters(normalizedAnswer).length,
    },
  };
}
