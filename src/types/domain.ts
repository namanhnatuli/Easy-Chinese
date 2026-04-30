export type UserRole = "anonymous" | "user" | "admin";
export type StoredUserRole = Exclude<UserRole, "anonymous">;

export type ReviewMode = "flashcard" | "multiple_choice" | "typing";
export type ReviewResult = "correct" | "incorrect" | "skipped";
export type SchedulerGrade = "again" | "hard" | "good" | "easy";
export type SchedulerType = "sm2" | "fsrs";
export type MemoryCardState = "new" | "learning" | "review" | "relearning";
export type ReadingPracticeType = "word" | "sentence";
export type PracticeProgressStatus = "new" | "practicing" | "completed" | "difficult";
export type PracticeEventType = "reading_word" | "reading_sentence" | "writing_character";
export type PracticeEventResult = "completed" | "difficult" | "skipped";
export type MemoryReviewResult = "correct" | "difficult" | "skipped";
export type TtsProvider = "azure" | "google";
export type TtsStorageAccess = "public" | "private";

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
export type AchievementKey =
  | "first_lesson_completed"
  | "seven_day_streak"
  | "fifty_words_learned"
  | "hundred_characters_written";

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

export interface TtsAudioCache extends TimestampedEntity {
  id: string;
  cacheKey: string;
  provider: TtsProvider;
  voice: string;
  languageCode: string;
  textHash: string;
  textPreview: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  characterCount: number;
  accessCount: number;
  createdBy: string | null;
  lastAccessedAt: string | null;
}

export interface UserReadingProgress extends TimestampedEntity {
  id: string;
  userId: string;
  wordId: string | null;
  exampleId: string | null;
  practiceType: ReadingPracticeType;
  status: PracticeProgressStatus;
  attemptCount: number;
  lastPracticedAt: string | null;
}

export interface UserWritingProgress extends TimestampedEntity {
  id: string;
  userId: string;
  wordId: string;
  character: string;
  status: PracticeProgressStatus;
  attemptCount: number;
  lastPracticedAt: string | null;
}

export interface PracticeEvent {
  id: string;
  userId: string;
  wordId: string | null;
  exampleId: string | null;
  practiceType: PracticeEventType;
  result: PracticeEventResult;
  createdAt: string;
}

export interface UserWordMemory extends TimestampedEntity {
  id: string;
  userId: string;
  wordId: string;
  schedulerType: SchedulerType;
  state: MemoryCardState;
  easeFactor: number;
  intervalDays: number;
  dueAt: string | null;
  reps: number;
  lapses: number;
  learningStepIndex: number;
  fsrsStability: number | null;
  fsrsDifficulty: number | null;
  fsrsRetrievability: number | null;
  scheduledDays: number;
  elapsedDays: number;
  lastReviewedAt: string | null;
  lastGrade: SchedulerGrade | null;
}

export interface UserLearningStats extends TimestampedEntity {
  userId: string;
  streakCount: number;
  lastActiveDate: string | null;
  dailyGoal: number;
  schedulerType: SchedulerType;
  desiredRetention: number;
  maximumIntervalDays: number;
}

export interface UserXp extends TimestampedEntity {
  userId: string;
  totalXp: number;
}

export interface UserLevel extends TimestampedEntity {
  userId: string;
  level: number;
  currentXp: number;
  nextLevelXp: number;
}

export interface UserAchievement extends TimestampedEntity {
  id: string;
  userId: string;
  achievementKey: AchievementKey;
  earnedAt: string;
}

export interface ReviewEvent {
  id: string;
  userId: string;
  wordId: string;
  mode: ReviewMode | null;
  result: ReviewResult | null;
  schedulerType: SchedulerType;
  practiceType: string;
  grade: SchedulerGrade;
  previousState: MemoryCardState | null;
  nextState: MemoryCardState | null;
  previousIntervalDays: number | null;
  nextIntervalDays: number | null;
  previousStability: number | null;
  nextStability: number | null;
  previousDifficulty: number | null;
  nextDifficulty: number | null;
  previousRetrievability: number | null;
  nextRetrievability: number | null;
  previousDueAt: string | null;
  nextDueAt: string | null;
  reviewedAt: string;
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
