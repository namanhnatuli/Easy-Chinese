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

function buildSenseMeaningPrompt(word: LessonStudyWord) {
  if (word.promptExample?.chineseText) {
    return `${word.hanzi} (${word.pinyin}) trong cau ${word.promptExample.chineseText} nghia la gi?`;
  }

  return `${word.hanzi} (${word.pinyin}) nghia la gi?`;
}

function buildSenseHanziPrompt(word: LessonStudyWord) {
  if (word.promptExample?.chineseText) {
    return `${word.vietnameseMeaning} trong cau ${word.promptExample.chineseText} la chu nao?`;
  }

  return `${word.vietnameseMeaning} la chu nao?`;
}

export function buildFlashcardPrompt(word: LessonStudyWord, index: number): FlashcardPrompt {
  // Alternate between Hanzi -> Meaning and Meaning -> Hanzi/Sound
  const isHanziFront = index % 2 === 0;
  
  return {
    mode: "flashcard",
    frontLabel: isHanziFront ? "Word" : "Meaning",
    frontText: isHanziFront ? buildSenseMeaningPrompt(word) : buildSenseHanziPrompt(word),
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
  // Alternate between Hanzi -> Meaning and Meaning -> Hanzi
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
        ? buildSenseMeaningPrompt(word)
        : buildSenseHanziPrompt(word),
    choices,
    correctChoice,
    explanation:
      variant === "hanzi_to_meaning"
        ? `${word.hanzi} (${word.pinyin}) means "${word.vietnameseMeaning}".`
        : `"${word.vietnameseMeaning}" is ${word.hanzi} (${word.pinyin}).`,
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
  
  // Alternate between Meaning -> Hanzi and Pinyin -> Hanzi
  // We avoid Meaning -> Pinyin here as the user might want to focus on characters
  const variant = currentIndex % 2 === 0 ? "meaning_to_hanzi" : "pinyin_to_hanzi";

  return {
    mode: "typing",
    variant,
    prompt:
      variant === "meaning_to_hanzi"
        ? buildSenseHanziPrompt(word)
        : word.promptExample?.chineseText
          ? `Chon dung am doc cho cau ${word.promptExample.chineseText}`
          : `Nhap chu cho cach doc ${word.pinyin}`,
    acceptedAnswers: uniqueStrings([
      word.simplified,
      word.hanzi,
      word.traditional ?? "",
    ].filter(Boolean)),
    placeholder: "Enter Chinese characters",
    // Remove pinyin hint from metadata as well to be safe, or keep it if we decide to use it elsewhere
    hint: undefined,
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
