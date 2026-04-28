export type UserRole = "anonymous" | "user" | "admin";
export type StoredUserRole = Exclude<UserRole, "anonymous">;

export type ReviewMode = "flashcard" | "multiple_choice" | "typing";
export type ReviewResult = "correct" | "incorrect" | "skipped";

export type ProgressStatus = "new" | "learning" | "review" | "mastered";
export type PreferredTheme = "light" | "dark" | "system";
export type PreferredFont = "sans" | "serif" | "kai";
export type SourceConfidenceLevel = "low" | "medium" | "high";
export type WordReviewStatus = "pending" | "needs_review" | "approved" | "rejected" | "applied";
export type WordAiStatus = "pending" | "processing" | "done" | "failed" | "skipped";
export type LearningArticleType =
  | "vocabulary_compare"
  | "grammar_note"
  | "usage_note"
  | "culture"
  | "other";
export type ArticleProgressStatus = "not_started" | "reading" | "completed";
export type LessonGenerationSource = "manual" | "auto";

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
  displayLabel: string | null;
  hanVietName: string | null;
  meaningVi: string;
  strokeCount: number;
  variantForms: string[];
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
  externalSource: string | null;
  externalId: string | null;
  sourceRowKey: string | null;
  normalizedText: string | null;
  meaningsVi: string | null;
  traditionalVariant: string | null;
  hskLevel: number;
  topicId: string | null;
  radicalId: string | null;
  partOfSpeech: string | null;
  componentBreakdownJson: unknown;
  radicalSummary: string | null;
  mnemonic: string | null;
  characterStructureType: string | null;
  structureExplanation: string | null;
  notes: string | null;
  ambiguityFlag: boolean;
  ambiguityNote: string | null;
  readingCandidates: string | null;
  reviewStatus: WordReviewStatus;
  aiStatus: WordAiStatus;
  sourceConfidence: SourceConfidenceLevel | null;
  contentHash: string | null;
  lastSyncedAt: string | null;
  lastSourceUpdatedAt: string | null;
  isPublished: boolean;
  createdBy: string | null;
}

export interface WordTag extends TimestampedEntity {
  id: string;
  slug: string;
  label: string;
  description: string | null;
}

export interface WordTagLink extends TimestampedEntity {
  wordId: string;
  wordTagId: string;
}

export interface WordRadical extends TimestampedEntity {
  wordId: string;
  radicalId: string;
  isMain: boolean;
  sortOrder: number;
}

export interface VocabSyncBatch extends TimestampedEntity {
  id: string;
  externalSource: string;
  sourceDocumentId: string | null;
  sourceSheetName: string | null;
  sourceSheetGid: string | null;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  initiatedBy: string | null;
  rawBatchPayload: Record<string, unknown> | null;
  totalRows: number;
  pendingRows: number;
  approvedRows: number;
  rejectedRows: number;
  appliedRows: number;
  errorRows: number;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface VocabSyncRow extends TimestampedEntity {
  id: string;
  batchId: string;
  externalSource: string;
  externalId: string | null;
  sourceRowKey: string;
  sourceRowNumber: number | null;
  sourceUpdatedAt: string | null;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown>;
  adminEditedPayload: Record<string, unknown> | null;
  contentHash: string | null;
  changeClassification: "new" | "changed" | "unchanged" | "conflict" | "invalid";
  matchResult: string | null;
  matchedWordIds: string[];
  parseErrors: string[];
  reviewStatus: WordReviewStatus;
  aiStatus: WordAiStatus;
  sourceConfidence: SourceConfidenceLevel | null;
  diffSummary: Record<string, unknown> | null;
  reviewNote: string | null;
  applyStatus: "pending" | "applied" | "failed" | "skipped";
  approvedBy: string | null;
  approvedAt: string | null;
  appliedWordId: string | null;
  appliedBy: string | null;
  appliedAt: string | null;
  errorMessage: string | null;
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
  generationSource: LessonGenerationSource;
  generationConfig: Record<string, unknown> | null;
  difficultyLevel: number | null;
  topicTagSlugs: string[];
  estimatedMinutes: number;
  wordCount: number;
  createdBy: string | null;
}

export interface LessonWord {
  lessonId: string;
  wordId: string;
  sortOrder: number;
  difficultyScore: number | null;
  relevanceScore: number | null;
  selectionReason: string | null;
  isNewWord: boolean;
  createdAt: string;
}

export interface LessonGrammarPoint {
  lessonId: string;
  grammarPointId: string;
  sortOrder: number;
  createdAt: string;
}

export interface LessonGenerationRun extends TimestampedEntity {
  id: string;
  requestedBy: string | null;
  hskLevel: number;
  topicTagSlugs: string[];
  targetWordCount: number;
  excludePublishedLessonWords: boolean;
  includeUnapprovedWords: boolean;
  allowReusedWords: boolean;
  generatedTitle: string;
  generatedSlug: string;
  generatedSummary: string;
  generatedWordCount: number;
  savedLessonId: string | null;
}

export interface LessonGenerationCandidate {
  runId: string;
  wordId: string;
  sortOrder: number;
  selected: boolean;
  difficultyScore: number;
  relevanceScore: number;
  selectionReason: string;
  lessonUsageCount: number;
  publishedLessonUsageCount: number;
  createdAt: string;
}

export interface LearningArticle extends TimestampedEntity {
  id: string;
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  hskLevel: number | null;
  articleType: LearningArticleType;
  isPublished: boolean;
  createdBy: string | null;
  publishedAt: string | null;
}

export interface LearningArticleTag extends TimestampedEntity {
  id: string;
  name: string;
  slug: string;
}

export interface LearningArticleTagLink {
  articleId: string;
  tagId: string;
  createdAt: string;
}

export interface LearningArticleWord {
  articleId: string;
  wordId: string;
  sortOrder: number;
  createdAt: string;
}

export interface LearningArticleGrammarPoint {
  articleId: string;
  grammarPointId: string;
  sortOrder: number;
  createdAt: string;
}

export interface UserArticleProgress extends TimestampedEntity {
  id: string;
  userId: string;
  articleId: string;
  status: ArticleProgressStatus;
  bookmarked: boolean;
  lastReadAt: string | null;
  completedAt: string | null;
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
    externalSource: null,
    externalId: null,
    sourceRowKey: null,
    normalizedText: "你好",
    meaningsVi: "xin chào",
    traditionalVariant: "你好",
    hskLevel: 1,
    topicId: "topic-greetings",
    radicalId: null,
    partOfSpeech: null,
    componentBreakdownJson: null,
    radicalSummary: null,
    mnemonic: null,
    characterStructureType: null,
    structureExplanation: null,
    notes: "Common greeting for daily conversation.",
    ambiguityFlag: false,
    ambiguityNote: null,
    readingCandidates: null,
    reviewStatus: "approved",
    aiStatus: "done",
    sourceConfidence: "high",
    contentHash: null,
    lastSyncedAt: null,
    lastSourceUpdatedAt: null,
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
    externalSource: null,
    externalId: null,
    sourceRowKey: null,
    normalizedText: "谢谢",
    meaningsVi: "cảm ơn",
    traditionalVariant: "謝謝",
    hskLevel: 1,
    topicId: "topic-greetings",
    radicalId: null,
    partOfSpeech: null,
    componentBreakdownJson: null,
    radicalSummary: null,
    mnemonic: null,
    characterStructureType: null,
    structureExplanation: null,
    notes: "Often repeated softly in casual speech.",
    ambiguityFlag: false,
    ambiguityNote: null,
    readingCandidates: null,
    reviewStatus: "approved",
    aiStatus: "done",
    sourceConfidence: "high",
    contentHash: null,
    lastSyncedAt: null,
    lastSourceUpdatedAt: null,
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
    externalSource: null,
    externalId: null,
    sourceRowKey: null,
    normalizedText: "再见",
    meaningsVi: "tạm biệt",
    traditionalVariant: "再見",
    hskLevel: 1,
    topicId: "topic-greetings",
    radicalId: null,
    partOfSpeech: null,
    componentBreakdownJson: null,
    radicalSummary: null,
    mnemonic: null,
    characterStructureType: null,
    structureExplanation: null,
    notes: "Used when parting.",
    ambiguityFlag: false,
    ambiguityNote: null,
    readingCandidates: null,
    reviewStatus: "approved",
    aiStatus: "done",
    sourceConfidence: "high",
    contentHash: null,
    lastSyncedAt: null,
    lastSourceUpdatedAt: null,
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
    generationSource: "manual",
    generationConfig: null,
    difficultyLevel: null,
    topicTagSlugs: ["greetings"],
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
    generationSource: "manual",
    generationConfig: null,
    difficultyLevel: null,
    topicTagSlugs: ["introductions"],
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
