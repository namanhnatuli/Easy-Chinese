import type {
  FlashcardPrompt,
  LessonStudyWord,
  MultipleChoiceStudyQuestion,
  TypingStudyQuestion,
} from "@/features/learning/types";

function rotatePool<T>(items: T[], startIndex: number): T[] {
  return items.slice(startIndex).concat(items.slice(0, startIndex));
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function buildFlashcardPrompt(word: LessonStudyWord, index: number): FlashcardPrompt {
  return {
    mode: "flashcard",
    frontLabel: "Hanzi",
    frontText: word.hanzi,
    back: {
      hanzi: word.hanzi,
      simplified: word.simplified,
      traditional: word.traditional,
      pinyin: word.pinyin,
      hanViet: word.hanViet,
      vietnameseMeaning: word.vietnameseMeaning,
      notes: word.notes,
      mnemonic: word.mnemonic,
      examples: word.examples,
    },
  };
}

export function buildMultipleChoiceQuestion(
  words: LessonStudyWord[],
  currentIndex: number,
): MultipleChoiceStudyQuestion {
  const word = words[currentIndex];
  const variant =
    currentIndex % 2 === 0 ? "hanzi_to_meaning" : "meaning_to_hanzi";
  const distractorPool = rotatePool(
    words.filter((candidate) => candidate.id !== word.id),
    currentIndex % Math.max(words.length - 1, 1),
  );

  const distractors = uniqueStrings(
    distractorPool.map((candidate) =>
      variant === "hanzi_to_meaning"
        ? candidate.vietnameseMeaning
        : candidate.hanzi,
    ),
  ).slice(0, 3);

  const correctChoice =
    variant === "hanzi_to_meaning" ? word.vietnameseMeaning : word.hanzi;
  const insertAt = currentIndex % (distractors.length + 1 || 1);
  const choices = [...distractors];
  choices.splice(insertAt, 0, correctChoice);

  return {
    mode: "multiple_choice",
    variant,
    prompt:
      variant === "hanzi_to_meaning"
        ? word.hanzi
        : word.vietnameseMeaning,
    choices,
    correctChoice,
    explanation:
      variant === "hanzi_to_meaning"
        ? `${word.hanzi} means “${word.vietnameseMeaning}”.`
        : `“${word.vietnameseMeaning}” is ${word.hanzi}.`,
    detailedAnswer: {
      hanzi: word.hanzi,
      simplified: word.simplified,
      traditional: word.traditional,
      pinyin: word.pinyin,
      hanViet: word.hanViet,
      vietnameseMeaning: word.vietnameseMeaning,
      notes: word.notes,
      mnemonic: word.mnemonic,
      examples: word.examples,
    },
  };
}

export function buildTypingQuestion(
  words: LessonStudyWord[],
  currentIndex: number,
): TypingStudyQuestion {
  const word = words[currentIndex];

  return {
    mode: "typing",
    variant: "meaning_to_hanzi",
    prompt: `${word.vietnameseMeaning}`,
    acceptedAnswers: uniqueStrings([
      word.simplified,
      word.hanzi,
      word.traditional ?? "",
    ].filter(Boolean)),
    placeholder: "Enter Chinese characters",
    hint: word.pinyin,
    detailedAnswer: {
      hanzi: word.hanzi,
      simplified: word.simplified,
      traditional: word.traditional,
      pinyin: word.pinyin,
      hanViet: word.hanViet,
      vietnameseMeaning: word.vietnameseMeaning,
      notes: word.notes,
      mnemonic: word.mnemonic,
      examples: word.examples,
    },
  };
}
