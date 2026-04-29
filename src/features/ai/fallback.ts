import type {
  AiExampleSentence,
  AiExplanationResult,
  ArticleAiContext,
  GrammarAiContext,
  WordAiContext,
} from "@/features/ai/types";

export function buildFallbackWordExplanation(context: WordAiContext): AiExplanationResult {
  return {
    title: `${context.hanzi} (${context.pinyin})`,
    explanation: `${context.hanzi} mang nghĩa chính là "${context.vietnameseMeaning}". ${
      context.notes ? context.notes : "Từ này thường được hiểu theo nghĩa cơ bản trước rồi mở rộng theo ngữ cảnh."
    }`,
    usage: [
      `Ưu tiên nhớ từ này cùng pinyin ${context.pinyin}.`,
      `Liên hệ với nghĩa tiếng Việt: ${context.vietnameseMeaning}.`,
      context.examples[0]
        ? `Đọc lại ví dụ: ${context.examples[0].chineseText}.`
        : "Tự đặt một câu ngắn với từ này để nhớ ngữ cảnh.",
    ],
    comparisons: context.similarWords.slice(0, 2).map(
      (word) => `So sánh với ${word.hanzi} (${word.pinyin}) vì từ này cũng liên quan đến: ${word.vietnameseMeaning}.`,
    ),
  };
}

export function buildFallbackGrammarExplanation(context: GrammarAiContext): AiExplanationResult {
  return {
    title: context.title,
    explanation: `${context.structureText} là mẫu ngữ pháp HSK ${context.hskLevel}. ${context.explanationVi}`,
    usage: [
      "Nhớ cấu trúc trước khi học thuộc cả câu dài.",
      context.examples[0]
        ? `Luyện lại ví dụ đầu tiên: ${context.examples[0].chineseText}.`
        : "Tự thay chủ ngữ hoặc tân ngữ để tạo thêm biến thể.",
      context.notes ? context.notes : "Ưu tiên dùng mẫu này trong câu ngắn trước.",
    ],
    comparisons: [],
  };
}

export function buildFallbackArticleExplanation(context: ArticleAiContext): AiExplanationResult {
  return {
    title: context.title,
    explanation: `${context.title} tập trung vào ${context.articleTypeLabel.toLowerCase()}. ${
      context.summary
    }`,
    usage: [
      "Đọc lại tiêu đề và tóm tắt trước khi đi vào chi tiết.",
      context.relatedWords[0]
        ? `Ôn lại từ liên quan ${context.relatedWords[0].hanzi} sau khi đọc xong.`
        : "Ghi lại 1-2 ý chính bằng tiếng Việt để củng cố hiểu bài.",
      "Quay lại bài viết sau một lần review để kiểm tra mức nhớ.",
    ],
    comparisons: [],
  };
}

export function buildFallbackSentences(context: WordAiContext, count: number): AiExampleSentence[] {
  const existing = context.examples.slice(0, count).map((example) => ({
    chinese: example.chineseText,
    pinyin: example.pinyin ?? context.pinyin,
    vietnameseMeaning: example.vietnameseMeaning,
  }));

  if (existing.length >= count) {
    return existing;
  }

  const generated: AiExampleSentence[] = [];
  const templates = [
    {
      chinese: `我想认真${context.hanzi}。`,
      pinyin: `Wǒ xiǎng rènzhēn ${context.pinyin}.`,
      vietnameseMeaning: `Tôi muốn ${context.vietnameseMeaning.toLowerCase()} một cách nghiêm túc.`,
    },
    {
      chinese: `老师常常让我们${context.hanzi}这个词。`,
      pinyin: `Lǎoshī chángcháng ràng wǒmen ${context.pinyin} zhège cí.`,
      vietnameseMeaning: `Giáo viên thường yêu cầu chúng tôi ${context.vietnameseMeaning.toLowerCase()} từ này.`,
    },
    {
      chinese: `每天练习以后，我对${context.hanzi}更熟悉了。`,
      pinyin: `Měitiān liànxí yǐhòu, wǒ duì ${context.pinyin} gèng shúxī le.`,
      vietnameseMeaning: `Sau khi luyện tập mỗi ngày, tôi quen hơn với ${context.vietnameseMeaning.toLowerCase()}.`,
    },
  ];

  for (const template of templates) {
    if (existing.length + generated.length >= count) {
      break;
    }

    generated.push(template);
  }

  return [...existing, ...generated].slice(0, count);
}
