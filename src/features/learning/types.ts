import type { ReviewMode, ReviewResult } from "@/types/domain";

export interface LessonStudyWord {
  id: string;
  slug: string;
  simplified: string;
  traditional: string | null;
  hanzi: string;
  pinyin: string;
  hanViet: string | null;
  vietnameseMeaning: string;
  sortOrder: number;
}

export interface FlashcardPrompt {
  mode: "flashcard";
  frontLabel: string;
  frontText: string;
  back: {
    hanzi: string;
    simplified: string;
    traditional: string | null;
    pinyin: string;
    hanViet: string | null;
    vietnameseMeaning: string;
  };
}

export interface MultipleChoiceStudyQuestion {
  mode: "multiple_choice";
  variant: "hanzi_to_meaning" | "meaning_to_hanzi";
  prompt: string;
  choices: string[];
  correctChoice: string;
  explanation: string;
}

export interface TypingStudyQuestion {
  mode: "typing";
  variant: "meaning_to_pinyin" | "pinyin_to_hanzi";
  prompt: string;
  acceptedAnswers: string[];
  placeholder: string;
  hint?: string;
}

export interface StudyOutcomeSubmission {
  lessonId?: string;
  wordId: string;
  mode: ReviewMode;
  result: ReviewResult;
  completionPercent: number;
}

export interface StudyFeedback {
  result: ReviewResult;
  message: string;
}
