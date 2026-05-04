export interface AiExplanationResult {
  title: string;
  explanation: string;
  usage: string[];
  comparisons: string[];
}

export interface AiExampleSentence {
  chinese: string;
  pinyin: string;
  vietnameseMeaning: string;
}

export interface WordAiContext {
  id: string;
  senseId: string | null;
  slug: string;
  hanzi: string;
  pinyin: string;
  vietnameseMeaning: string;
  hskLevel: number;
  partOfSpeech: string | null;
  notes: string | null;
  meaningsVi: string | null;
  examples: Array<{
    chineseText: string;
    pinyin: string | null;
    vietnameseMeaning: string;
  }>;
  similarWords: Array<{
    hanzi: string;
    pinyin: string;
    vietnameseMeaning: string;
  }>;
}

export interface GrammarAiContext {
  id: string;
  slug: string;
  title: string;
  structureText: string;
  explanationVi: string;
  hskLevel: number;
  notes: string | null;
  examples: Array<{
    chineseText: string;
    pinyin: string | null;
    vietnameseMeaning: string;
  }>;
}

export interface ArticleAiContext {
  id: string;
  slug: string;
  title: string;
  summary: string;
  hskLevel: number | null;
  articleTypeLabel: string;
  relatedWords: Array<{
    hanzi: string;
    pinyin: string;
    vietnameseMeaning: string;
  }>;
}
