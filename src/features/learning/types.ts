import type { ReviewMode, ReviewResult, SchedulerGrade } from "@/types/domain";

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
  notes?: string | null;
  mnemonic?: string | null;
  examples?: Array<{
    id: string;
    chineseText: string;
    pinyin: string;
    vietnameseMeaning: string;
  }>;
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
    notes?: string | null;
    mnemonic?: string | null;
    examples?: Array<{
      id: string;
      chineseText: string;
      pinyin: string;
      vietnameseMeaning: string;
    }>;
  };
}

export interface MultipleChoiceStudyQuestion {
  mode: "multiple_choice";
  variant: "hanzi_to_meaning" | "meaning_to_hanzi";
  prompt: string;
  choices: string[];
  correctChoice: string;
  explanation: string;
  detailedAnswer?: FlashcardPrompt["back"];
}

export interface TypingStudyQuestion {
  mode: "typing";
  variant: "meaning_to_pinyin" | "pinyin_to_hanzi" | "meaning_to_hanzi";
  prompt: string;
  acceptedAnswers: string[];
  placeholder: string;
  hint?: string;
  detailedAnswer?: FlashcardPrompt["back"];
}

export interface StudyOutcomeSubmission {
  lessonId?: string;
  wordId: string;
  mode: ReviewMode;
  result: ReviewResult;
  grade?: SchedulerGrade;
  completionPercent: number;
}

export interface StudyFeedback {
  result: ReviewResult;
  message: string;
}
