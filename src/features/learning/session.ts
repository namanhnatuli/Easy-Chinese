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
  const showChineseFront = index % 2 === 0;

  return {
    mode: "flashcard",
    frontLabel: showChineseFront ? "Chinese" : "Vietnamese meaning",
    frontText: showChineseFront ? word.hanzi : word.vietnameseMeaning,
    back: {
      hanzi: word.hanzi,
      simplified: word.simplified,
      traditional: word.traditional,
      pinyin: word.pinyin,
      hanViet: word.hanViet,
      vietnameseMeaning: word.vietnameseMeaning,
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
  };
}

export function buildTypingQuestion(
  words: LessonStudyWord[],
  currentIndex: number,
): TypingStudyQuestion {
  const word = words[currentIndex];
  const variant =
    currentIndex % 2 === 0 ? "meaning_to_pinyin" : "pinyin_to_hanzi";

  if (variant === "meaning_to_pinyin") {
    return {
      mode: "typing",
      variant,
      prompt: `Type the pinyin for: ${word.vietnameseMeaning}`,
      acceptedAnswers: [word.pinyin],
      placeholder: "Enter pinyin",
      hint: word.hanzi,
    };
  }

  return {
    mode: "typing",
    variant,
    prompt: `Type the Chinese word for: ${word.pinyin}`,
    acceptedAnswers: uniqueStrings([
      word.simplified,
      word.hanzi,
      word.traditional ?? "",
    ].filter(Boolean)),
    placeholder: "Enter Chinese characters",
    hint: word.vietnameseMeaning,
  };
}
