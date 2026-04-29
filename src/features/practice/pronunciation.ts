export interface PronunciationComparisonSegment {
  character: string;
  expected: boolean;
}

export interface PronunciationComparison {
  normalizedExpected: string;
  normalizedTranscript: string;
  transcript: string;
  isCorrect: boolean;
  matchRatio: number;
  segments: PronunciationComparisonSegment[];
}

function normalizePronunciationText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .trim();
}

export function comparePronunciation({
  expected,
  transcript,
}: {
  expected: string;
  transcript: string;
}): PronunciationComparison {
  const normalizedExpected = normalizePronunciationText(expected);
  const normalizedTranscript = normalizePronunciationText(transcript);
  const transcriptCharacters = Array.from(normalizedTranscript);
  const expectedCharacters = Array.from(normalizedExpected);

  let matchingCharacters = 0;
  const segments = expectedCharacters.map((character, index) => {
    const isMatch = transcriptCharacters[index] === character;
    if (isMatch) {
      matchingCharacters += 1;
    }

    return {
      character,
      expected: isMatch,
    };
  });

  const isCorrect =
    normalizedExpected.length > 0 &&
    normalizedExpected === normalizedTranscript;

  return {
    normalizedExpected,
    normalizedTranscript,
    transcript,
    isCorrect,
    matchRatio:
      normalizedExpected.length === 0
        ? 0
        : matchingCharacters / normalizedExpected.length,
    segments,
  };
}
