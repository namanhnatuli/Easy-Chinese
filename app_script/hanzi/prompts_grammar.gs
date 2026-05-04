function buildGeminiGrammarBatchPrompt_(batchItems) {
  const inputJson = JSON.stringify(batchItems);
  return [
    'Bạn là trợ lý chuẩn hóa dữ liệu ngữ pháp tiếng Trung cho một ứng dụng học tiếng Trung dành cho người Việt.',
    '',
    'Bạn sẽ nhận danh sách các item ngữ pháp thô từ sheet Google Sheets.',
    'Mục tiêu: chuyển từng item sang cấu trúc phù hợp.',
    '',
    'QUY TẮC CHO MỖI ITEM:',
    '- title: tiêu đề ngắn gọn.',
    '- slug: slug tiếng Anh/không dấu, lowercase.',
    '- structure_text: mẫu/cấu trúc ngữ pháp.',
    '- explanation_vi: giải thích tiếng Việt rõ ràng.',
    '- examples: mảng object {chinese_text, pinyin, vietnamese_meaning}.',
    '- hsk_level: chuỗi số "1"..."9".',
    '- review_status: pending hoặc needs_review.',
    '',
    'RÀNG BUỘC:',
    '- Không markdown. Chỉ JSON.',
    '- Giữ nguyên row_key.',
    '',
    'INPUT ITEMS:',
    inputJson
  ].join('\n');
}

function buildGeminiGrammarBatchResponseSchema_() {
  return {
    type: 'OBJECT',
    properties: {
      items: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            row_key: { type: 'STRING' },
            title: { type: 'STRING' },
            slug: { type: 'STRING' },
            structure_text: { type: 'STRING' },
            explanation_vi: { type: 'STRING' },
            notes: { type: 'STRING' },
            examples: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  chinese_text: { type: 'STRING' },
                  pinyin: { type: 'STRING' },
                  vietnamese_meaning: { type: 'STRING' }
                }
              }
            },
            hsk_level: { type: 'STRING' },
            source_confidence: { type: 'STRING' },
            ambiguity_flag: { type: 'BOOLEAN' },
            ambiguity_note: { type: 'STRING' },
            review_status: { type: 'STRING' }
          },
          required: ['row_key', 'title', 'explanation_vi']
        }
      }
    },
    required: ['items']
  };
}
