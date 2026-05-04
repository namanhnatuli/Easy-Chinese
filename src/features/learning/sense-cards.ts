export interface LearningSenseExample {
  id: string;
  chineseText: string;
  pinyin: string | null;
  vietnameseMeaning: string;
  sortOrder: number;
  senseId: string | null;
}

export interface LearningSenseRecord {
  id: string;
  pinyin: string;
  partOfSpeech: string | null;
  meaningVi: string;
  usageNote: string | null;
  senseOrder: number;
  isPrimary: boolean;
}

export interface LearningWordRecord {
  id: string;
  slug: string;
  simplified: string;
  traditional: string | null;
  hanzi: string;
  pinyin: string;
  hanViet: string | null;
  vietnameseMeaning: string;
  hskLevel: number;
  notes?: string | null;
  mnemonic?: string | null;
}

export interface ResolvedLearningSenseCard {
  id: string;
  wordId: string;
  senseId: string | null;
  slug: string;
  simplified: string;
  traditional: string | null;
  hanzi: string;
  pinyin: string;
  hanViet: string | null;
  vietnameseMeaning: string;
  hskLevel: number;
  notes: string | null;
  mnemonic: string | null;
  partOfSpeech: string | null;
  isPrimary: boolean;
  examples: Array<{
    id: string;
    chineseText: string;
    pinyin: string;
    vietnameseMeaning: string;
  }>;
  promptExample:
    | {
        id: string;
        chineseText: string;
        pinyin: string | null;
        vietnameseMeaning: string;
      }
    | null;
}

function createLegacyFallbackSense(word: LearningWordRecord): LearningSenseRecord {
  return {
    id: `legacy-${word.id}`,
    pinyin: word.pinyin,
    partOfSpeech: null,
    meaningVi: word.vietnameseMeaning,
    usageNote: word.notes ?? null,
    senseOrder: 1,
    isPrimary: true,
  };
}

export function buildLearningSenseCards(input: {
  word: LearningWordRecord;
  senses: LearningSenseRecord[];
  examples: LearningSenseExample[];
  preferredSenseId?: string | null;
}) {
  const senses = input.senses.length > 0 ? input.senses.slice().sort((a, b) => a.senseOrder - b.senseOrder) : [createLegacyFallbackSense(input.word)];
  const primarySenseId = senses.find((sense) => sense.isPrimary)?.id ?? senses[0]?.id ?? null;
  const filteredSenses =
    input.preferredSenseId && senses.some((sense) => sense.id === input.preferredSenseId)
      ? senses.filter((sense) => sense.id === input.preferredSenseId)
      : senses;

  return filteredSenses.map((sense) => {
    const examples = input.examples
      .filter(
        (example) =>
          example.senseId === sense.id ||
          (example.senseId === null && primarySenseId === sense.id && filteredSenses.length === 1),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);

    return {
      id: sense.id,
      wordId: input.word.id,
      senseId: input.senses.length > 0 ? sense.id : null,
      slug: input.word.slug,
      simplified: input.word.simplified,
      traditional: input.word.traditional,
      hanzi: input.word.hanzi,
      pinyin: sense.pinyin,
      hanViet: input.word.hanViet,
      vietnameseMeaning: sense.meaningVi,
      hskLevel: input.word.hskLevel,
      notes: sense.usageNote ?? input.word.notes ?? null,
      mnemonic: input.word.mnemonic ?? null,
      partOfSpeech: sense.partOfSpeech,
      isPrimary: sense.isPrimary,
      examples: examples.map((example) => ({
        id: example.id,
        chineseText: example.chineseText,
        pinyin: example.pinyin ?? "",
        vietnameseMeaning: example.vietnameseMeaning,
      })),
      promptExample: examples[0]
        ? {
            id: examples[0].id,
            chineseText: examples[0].chineseText,
            pinyin: examples[0].pinyin,
            vietnameseMeaning: examples[0].vietnameseMeaning,
          }
        : null,
    } satisfies ResolvedLearningSenseCard;
  });
}
