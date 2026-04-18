export type UserRole = "anonymous" | "user" | "admin";
export type StoredUserRole = Exclude<UserRole, "anonymous">;

export type ReviewMode = "flashcard" | "multiple_choice" | "typing";
export type ReviewResult = "correct" | "incorrect" | "skipped";

export type ProgressStatus = "new" | "learning" | "review" | "mastered";
export type PreferredTheme = "light" | "dark" | "system";
export type PreferredFont = "sans" | "serif" | "kai";

export interface TimestampedEntity {
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: StoredUserRole;
}

export interface Profile extends TimestampedEntity {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: StoredUserRole;
  preferredLanguage: string;
  preferredTheme: PreferredTheme;
  preferredFont: PreferredFont;
}

export interface Topic extends TimestampedEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Radical extends TimestampedEntity {
  id: string;
  radical: string;
  pinyin: string | null;
  meaningVi: string;
  strokeCount: number;
}

export interface Word extends TimestampedEntity {
  id: string;
  slug: string;
  simplified: string;
  traditional: string | null;
  hanzi: string;
  pinyin: string;
  hanViet: string | null;
  vietnameseMeaning: string;
  englishMeaning: string | null;
  hskLevel: number;
  topicId: string | null;
  radicalId: string | null;
  notes: string | null;
  isPublished: boolean;
  createdBy: string | null;
}

export interface WordExample extends TimestampedEntity {
  id: string;
  wordId: string;
  chineseText: string;
  pinyin: string | null;
  vietnameseMeaning: string;
  sortOrder: number;
}

export interface GrammarPoint extends TimestampedEntity {
  id: string;
  title: string;
  slug: string;
  hskLevel: number;
  structureText: string;
  explanationVi: string;
  notes: string | null;
  isPublished: boolean;
  createdBy: string | null;
}

export interface GrammarExample extends TimestampedEntity {
  id: string;
  grammarPointId: string;
  chineseText: string;
  pinyin: string | null;
  vietnameseMeaning: string;
  sortOrder: number;
}

export interface Lesson extends TimestampedEntity {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  hskLevel: number;
  topicId: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdBy: string | null;
}

export interface LessonWord {
  lessonId: string;
  wordId: string;
  sortOrder: number;
  createdAt: string;
}

export interface LessonGrammarPoint {
  lessonId: string;
  grammarPointId: string;
  sortOrder: number;
  createdAt: string;
}

export interface UserWordProgress extends TimestampedEntity {
  id: string;
  userId: string;
  wordId: string;
  status: ProgressStatus;
  correctCount: number;
  incorrectCount: number;
  streakCount: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  easeFactor: number;
  intervalDays: number;
}

export interface UserLessonProgress extends TimestampedEntity {
  id: string;
  userId: string;
  lessonId: string;
  completionPercent: number;
  lastStudiedAt: string | null;
  completedAt: string | null;
}

export interface ReviewEvent {
  id: string;
  userId: string;
  wordId: string;
  mode: ReviewMode;
  result: ReviewResult;
  reviewedAt: string;
  createdAt: string;
}

export interface LessonSummary extends Lesson {
  topicName: string | null;
  wordCount: number;
  grammarCount: number;
  estimatedMinutes: number;
}

export interface LessonDetail extends LessonSummary {
  words: Word[];
  grammarPoints: GrammarPoint[];
  wordExamples?: WordExample[];
  grammarExamples?: GrammarExample[];
}

export interface LearningCard {
  id: string;
  prompt: string;
  answer: string;
  supportingText?: string;
  romanization?: string;
}

export interface MultipleChoiceQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctChoice: string;
  explanation?: string;
}

export interface TypingQuestion {
  id: string;
  prompt: string;
  expectedAnswer: string;
  placeholder?: string;
  hint?: string;
}

export const sampleWords: Word[] = [
  {
    id: "word-ni-hao",
    simplified: "你好",
    traditional: "你好",
    hanzi: "你好",
    slug: "ni-hao",
    pinyin: "nǐ hǎo",
    hanViet: "nhĩ hảo",
    vietnameseMeaning: "xin chào",
    englishMeaning: "hello",
    hskLevel: 1,
    topicId: "topic-greetings",
    radicalId: null,
    notes: "Common greeting for daily conversation.",
    isPublished: true,
    createdBy: null,
    createdAt: "2026-04-16T00:00:00.000Z",
    updatedAt: "2026-04-16T00:00:00.000Z",
  },
  {
    id: "word-xie-xie",
    simplified: "谢谢",
    traditional: "謝謝",
    hanzi: "谢谢",
    slug: "xie-xie",
    pinyin: "xiè xie",
    hanViet: "tạ tạ",
    vietnameseMeaning: "cảm ơn",
    englishMeaning: "thank you",
    hskLevel: 1,
    topicId: "topic-greetings",
    radicalId: null,
    notes: "Often repeated softly in casual speech.",
    isPublished: true,
    createdBy: null,
    createdAt: "2026-04-16T00:00:00.000Z",
    updatedAt: "2026-04-16T00:00:00.000Z",
  },
  {
    id: "word-zai-jian",
    simplified: "再见",
    traditional: "再見",
    hanzi: "再见",
    slug: "zai-jian",
    pinyin: "zài jiàn",
    hanViet: "tái kiến",
    vietnameseMeaning: "tạm biệt",
    englishMeaning: "goodbye",
    hskLevel: 1,
    topicId: "topic-greetings",
    radicalId: null,
    notes: "Used when parting.",
    isPublished: true,
    createdBy: null,
    createdAt: "2026-04-16T00:00:00.000Z",
    updatedAt: "2026-04-16T00:00:00.000Z",
  },
];

export const sampleGrammarPoints: GrammarPoint[] = [
  {
    id: "grammar-ma-question",
    title: "Particle 吗 for yes/no questions",
    slug: "ma-question-particle",
    hskLevel: 1,
    structureText: "Statement + 吗？",
    explanationVi: "Thêm 吗 vào cuối câu để chuyển câu trần thuật thành câu hỏi yes/no.",
    notes: "Keep the base sentence order unchanged.",
    isPublished: true,
    createdBy: null,
    createdAt: "2026-04-16T00:00:00.000Z",
    updatedAt: "2026-04-16T00:00:00.000Z",
  },
];

export const sampleLessons: LessonDetail[] = [
  {
    id: "lesson-1",
    slug: "survival-greetings",
    title: "Survival Greetings",
    description: "Learn the first greeting phrases, polite responses, and a simple question form.",
    hskLevel: 1,
    topicId: "topic-greetings",
    topicName: "Greetings",
    wordCount: 12,
    grammarCount: 1,
    estimatedMinutes: 10,
    isPublished: true,
    sortOrder: 1,
    createdBy: null,
    createdAt: "2026-04-16T00:00:00.000Z",
    updatedAt: "2026-04-16T00:00:00.000Z",
    words: sampleWords,
    grammarPoints: sampleGrammarPoints,
  },
  {
    id: "lesson-2",
    slug: "introducing-yourself",
    title: "Introducing Yourself",
    description: "Basic self-introduction phrases for names, nationality, and polite follow-ups.",
    hskLevel: 1,
    topicId: "topic-introductions",
    topicName: "Introductions",
    wordCount: 15,
    grammarCount: 2,
    estimatedMinutes: 14,
    isPublished: true,
    sortOrder: 2,
    createdBy: null,
    createdAt: "2026-04-16T00:00:00.000Z",
    updatedAt: "2026-04-16T00:00:00.000Z",
    words: sampleWords,
    grammarPoints: sampleGrammarPoints,
  },
];

export const sampleLearningCards: LearningCard[] = sampleWords.map((word) => ({
  id: word.id,
  prompt: word.hanzi,
  answer: word.vietnameseMeaning,
  romanization: word.pinyin,
  supportingText: word.hanViet ?? undefined,
}));

export const sampleMultipleChoiceQuestions: MultipleChoiceQuestion[] = [
  {
    id: "mc-1",
    prompt: "你好",
    choices: ["xin chào", "cảm ơn", "tạm biệt", "xin lỗi"],
    correctChoice: "xin chào",
    explanation: "你好 is the standard greeting for hello.",
  },
  {
    id: "mc-2",
    prompt: "谢谢",
    choices: ["xin chào", "cảm ơn", "không sao", "tạm biệt"],
    correctChoice: "cảm ơn",
    explanation: "谢谢 means thank you.",
  },
];

export const sampleTypingQuestions: TypingQuestion[] = [
  {
    id: "typing-1",
    prompt: "Type the pinyin for 你好",
    expectedAnswer: "nǐ hǎo",
    placeholder: "nǐ hǎo",
    hint: "It has two third tones.",
  },
  {
    id: "typing-2",
    prompt: "Type the Vietnamese meaning for 再见",
    expectedAnswer: "tạm biệt",
    placeholder: "tạm biệt",
    hint: "You say this when leaving.",
  },
];
