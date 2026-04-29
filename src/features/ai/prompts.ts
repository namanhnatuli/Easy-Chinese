import type { ArticleAiContext, GrammarAiContext, WordAiContext } from "@/features/ai/types";

function formatExamples(
  examples: Array<{ chineseText: string; pinyin: string | null; vietnameseMeaning: string }>,
) {
  if (examples.length === 0) {
    return "Không có ví dụ sẵn có.";
  }

  return examples
    .slice(0, 3)
    .map(
      (example, index) =>
        `${index + 1}. ${example.chineseText} | ${example.pinyin ?? "không có pinyin"} | ${example.vietnameseMeaning}`,
    )
    .join("\n");
}

export function buildWordExplanationPrompt(context: WordAiContext) {
  return `
Bạn là trợ lý dạy tiếng Trung cho người học Việt Nam.
Hãy trả về JSON hợp lệ với các khóa: title, explanation, usage, comparisons.
Yêu cầu:
- explanation: 2-4 câu tiếng Việt, giải thích nghĩa và cách dùng.
- usage: mảng 2-4 gạch đầu dòng ngắn bằng tiếng Việt.
- comparisons: mảng 0-3 gợi ý so sánh với từ gần nghĩa hoặc dễ nhầm.

Từ:
- Hanzi: ${context.hanzi}
- Pinyin: ${context.pinyin}
- Nghĩa: ${context.vietnameseMeaning}
- HSK: ${context.hskLevel}
- Từ loại: ${context.partOfSpeech ?? "không rõ"}
- Nghĩa mở rộng: ${context.meaningsVi ?? "không có"}
- Ghi chú: ${context.notes ?? "không có"}

Ví dụ có sẵn:
${formatExamples(context.examples)}

Từ tương tự:
${context.similarWords.length === 0
    ? "không có"
    : context.similarWords.map((word) => `${word.hanzi} (${word.pinyin}) - ${word.vietnameseMeaning}`).join("; ")}
`;
}

export function buildGrammarExplanationPrompt(context: GrammarAiContext) {
  return `
Bạn là trợ lý dạy ngữ pháp tiếng Trung cho người học Việt Nam.
Hãy trả về JSON hợp lệ với các khóa: title, explanation, usage, comparisons.
Yêu cầu:
- explanation: 2-4 câu tiếng Việt.
- usage: mảng 2-4 gạch đầu dòng ngắn giải thích khi nào dùng mẫu.
- comparisons: mảng 0-3 điểm so sánh với mẫu gần giống nếu cần.

Điểm ngữ pháp:
- Tiêu đề: ${context.title}
- Cấu trúc: ${context.structureText}
- HSK: ${context.hskLevel}
- Giải thích hiện có: ${context.explanationVi}
- Ghi chú: ${context.notes ?? "không có"}

Ví dụ:
${formatExamples(context.examples)}
`;
}

export function buildArticleExplanationPrompt(context: ArticleAiContext) {
  return `
Bạn là trợ lý học tiếng Trung cho người học Việt Nam.
Hãy trả về JSON hợp lệ với các khóa: title, explanation, usage, comparisons.
Yêu cầu:
- explanation: 2-4 câu tóm tắt bài viết theo góc nhìn học tập.
- usage: mảng 2-4 ý rút ra để áp dụng khi học.
- comparisons: mảng 0-3 điểm liên hệ với từ/cấu trúc liên quan nếu có.

Bài viết:
- Tiêu đề: ${context.title}
- Tóm tắt: ${context.summary}
- Loại: ${context.articleTypeLabel}
- HSK: ${context.hskLevel ?? "không có"}

Từ liên quan:
${context.relatedWords.length === 0
    ? "không có"
    : context.relatedWords.map((word) => `${word.hanzi} (${word.pinyin}) - ${word.vietnameseMeaning}`).join("; ")}
`;
}

export function buildSentenceGenerationPrompt(context: WordAiContext, count: number) {
  return `
Bạn là trợ lý dạy tiếng Trung cho người học Việt Nam.
Hãy trả về JSON hợp lệ với khóa "sentences", là mảng đúng ${count} phần tử.
Mỗi phần tử phải có các khóa: chinese, pinyin, vietnameseMeaning.
Yêu cầu:
- Câu ngắn, tự nhiên, phù hợp người học.
- Bắt buộc dùng từ ${context.hanzi}.
- Nghĩa tiếng Việt rõ ràng, không quá dài.

Thông tin từ:
- Hanzi: ${context.hanzi}
- Pinyin: ${context.pinyin}
- Nghĩa: ${context.vietnameseMeaning}
- HSK: ${context.hskLevel}
- Từ loại: ${context.partOfSpeech ?? "không rõ"}
`;
}
