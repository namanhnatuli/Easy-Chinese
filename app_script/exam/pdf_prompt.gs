function buildPdfPageParsePrompt_(params) {
  return [
    'Bạn là hệ thống trích xuất đề thi HSK từ PDF sang JSON để lưu vào Google Sheet.',
    '',
    'Hãy phân tích CHỈ phần/trang được yêu cầu.',
    '',
    `exam_set_id: ${params.examSetId}`,
    `target_page_no: ${params.pageNo}`,
    `part_key: ${params.partKey}`,
    `section_type: ${params.sectionType}`,
    `question_from: ${params.questionFrom}`,
    `question_to: ${params.questionTo}`,
    '',
    'YÊU CẦU CHUNG:',
    '- Chỉ trả về JSON hợp lệ.',
    '- Không markdown.',
    '- Không tự bịa đáp án nếu trên trang không có đáp án.',
    '- question_no phải đúng số trong PDF.',
    '- Với Listening, nếu câu hỏi thực tế nằm trong audio và không có text trên PDF, question_text_zh để rỗng.',
    '- Với Reading, trích xuất chữ Hán và pinyin nếu có.',
    '- answer_key để rỗng nếu đề không hiển thị đáp án.',
    '',
    'PHÂN LOẠI question_type:',
    '- listen_true_false_image',
    '- listen_choose_picture',
    '- listen_match_picture',
    '- listen_choose_text',
    '- read_true_false_image_word',
    '- read_match_picture',
    '- read_match_response',
    '- read_fill_blank_word',
    '',
    'QUY TẮC OPTIONS BẮT BUỘC:',
    '- Với question_type = listen_true_false_image:',
    '  + mỗi question BẮT BUỘC có options gồm đúng 2 item:',
    '    1) option_key="T", option_order=1, option_type="boolean", text_zh="对", text_vi="Đúng"',
    '    2) option_key="F", option_order=2, option_type="boolean", text_zh="错", text_vi="Sai"',
    '  + không được để options=[].',
    '',
    '- Với question_type = read_true_false_image_word:',
    '  + mỗi question BẮT BUỘC có options gồm đúng 2 item:',
    '    1) option_key="T", option_order=1, option_type="boolean", text_zh="对", text_vi="Đúng"',
    '    2) option_key="F", option_order=2, option_type="boolean", text_zh="错", text_vi="Sai"',
    '  + không được để options=[].',
    '',
    '- Với question_type = listen_choose_picture:',
    '  + mỗi question phải có options A/B/C.',
    '  + option_type="image".',
    '  + text_zh, pinyin, text_vi để rỗng nếu option là ảnh.',
    '  + asset_hint mô tả ngắn ảnh.',
    '',
    '- Với question_type = listen_choose_text:',
    '  + mỗi question phải có options A/B/C.',
    '  + option_type="text".',
    '  + điền text_zh, pinyin nếu thấy trên trang.',
    '',
    '- Với question_type = listen_match_picture hoặc read_match_picture hoặc read_match_response hoặc read_fill_blank_word:',
    '  + các lựa chọn chung A-F đặt trong group_options.',
    '  + questions[].options có thể để [].',
    '',
    'QUY TẮC ASSETS:',
    '- Nếu câu hỏi là dạng hình ảnh, tạo asset trong assets.',
    '- Không cần crop ảnh; hãy tạo asset_hint mô tả ảnh.',
    '- Nếu ảnh thuộc câu hỏi, owner_type="question", owner_ref là số câu hỏi dạng string, ví dụ "1", "21".',
    '- Nếu ảnh thuộc option, owner_type="option", owner_ref có dạng "6_A", "6_B".',
    '- asset_key nên có dạng "q1_image", "q6_A_image".',
    '',
    'QUY TẮC INSTRUCTION:',
    '- instruction nên là tiếng Việt dễ hiển thị trong app.',
    '- Ví dụ listen_true_false_image: "Nghe và chọn Đúng / Sai".',
    '- Ví dụ listen_choose_picture: "Nghe và chọn hình đúng".',
    '- Ví dụ read_fill_blank_word: "Chọn từ điền vào chỗ trống".',
    '',
    'Trả về cấu trúc JSON gồm:',
    '- page_no',
    '- part_key',
    '- section',
    '- group',
    '- questions',
    '- group_options',
    '- assets',
    '',
    'LƯU Ý:',
    '- group_options dùng cho các phần có option chung A-F.',
    '- questions[].options dùng cho option riêng từng câu như A/B/C hoặc true/false.',
    '- assets chỉ lưu metadata/hint, không cần file ảnh thật.'
  ].join('\n');
}

function buildPdfPageParseSchema_() {
  return {
    type: 'OBJECT',
    properties: {
      page_no: { type: 'INTEGER' },
      part_key: { type: 'STRING' },
      section: {
        type: 'OBJECT',
        properties: {
          section_type: { type: 'STRING' },
          title_zh: { type: 'STRING' },
          title_vi: { type: 'STRING' }
        }
      },
      group: {
        type: 'OBJECT',
        properties: {
          group_order: { type: 'INTEGER' },
          part_no: { type: 'INTEGER' },
          question_from: { type: 'INTEGER' },
          question_to: { type: 'INTEGER' },
          question_type: { type: 'STRING' },
          instruction: { type: 'STRING' }
        }
      },
      questions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            question_no: { type: 'INTEGER' },
            question_type: { type: 'STRING' },
            question_text_zh: { type: 'STRING' },
            question_text_pinyin: { type: 'STRING' },
            question_text_vi: { type: 'STRING' },
            stem_text: { type: 'STRING' },
            answer_key: { type: 'STRING' },
            options: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  option_key: { type: 'STRING' },
                  option_order: { type: 'INTEGER' },
                  option_type: { type: 'STRING' },
                  text_zh: { type: 'STRING' },
                  pinyin: { type: 'STRING' },
                  text_vi: { type: 'STRING' },
                  asset_hint: { type: 'STRING' }
                }
              }
            }
          }
        }
      },
      group_options: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            option_key: { type: 'STRING' },
            option_order: { type: 'INTEGER' },
            option_type: { type: 'STRING' },
            text_zh: { type: 'STRING' },
            pinyin: { type: 'STRING' },
            text_vi: { type: 'STRING' },
            asset_hint: { type: 'STRING' }
          }
        }
      },
      assets: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            asset_key: { type: 'STRING' },
            owner_type: { type: 'STRING' },
            owner_ref: { type: 'STRING' },
            asset_type: { type: 'STRING' },
            asset_hint: { type: 'STRING' }
          }
        }
      }
    },
    required: ['page_no', 'part_key', 'group', 'questions']
  };
}