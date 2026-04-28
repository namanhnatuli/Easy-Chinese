import type { ArticleProgressStatus, LearningArticleType } from "@/types/domain";

export const LEARNING_ARTICLE_TYPE_OPTIONS: Array<{
  value: LearningArticleType;
  label: string;
}> = [
  { value: "vocabulary_compare", label: "Vocabulary compare" },
  { value: "grammar_note", label: "Grammar note" },
  { value: "usage_note", label: "Usage note" },
  { value: "culture", label: "Culture" },
  { value: "other", label: "Other" },
];

export const LEARNING_ARTICLE_STATUS_OPTIONS: Array<{
  value: ArticleProgressStatus;
  label: string;
}> = [
  { value: "not_started", label: "Not started" },
  { value: "reading", label: "Reading" },
  { value: "completed", label: "Completed" },
];

export function getLearningArticleTypeLabel(value: LearningArticleType) {
  return LEARNING_ARTICLE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
