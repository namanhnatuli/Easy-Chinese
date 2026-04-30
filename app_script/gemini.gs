function generateEntryWithGemini_(inputText, forceRefresh) {
  if (!forceRefresh) {
    const cached = getCachedEntry_(inputText);
    if (cached) return cached;
  }

  const result = callGeminiRoundRobin_(inputText);
  upsertCachedEntry_(inputText, result);
  return result;
}

function generateBatchEntriesWithGemini_(batchItems) {
  return callGeminiBatchRoundRobin_(batchItems);
}

function generateBatchEntriesWithGeminiForKey_(batchItems, workerIndex) {
  const keyInfo = takeNextGeminiApiKey_();
  const modelInfo = takeNextGeminiModel_();

  const apiKey = keyInfo.apiKey;
  const model = modelInfo.model;

  const startedAt = Date.now();
  const keyMasked = maskApiKey_(apiKey);

  console.log(
    `[WORKER ${workerIndex}] GEMINI START keyIndex=${keyInfo.keyIndex} key=${keyMasked} modelIndex=${modelInfo.modelIndex} model=${model} size=${batchItems.length}`
  );

  try {
    const result = callGeminiBatchWithRetryPerModel_(model, apiKey, batchItems);
    const durationMs = Date.now() - startedAt;

    result.__meta = { apiKey, model, durationMs };

    console.log(
      `[WORKER ${workerIndex}] GEMINI SUCCESS keyIndex=${keyInfo.keyIndex} model=${model} duration=${durationMs}ms`
    );

    return result;
  } catch (err) {
    const durationMs = Date.now() - startedAt;

    err.__meta = { apiKey, model, durationMs };

    console.log(
      `[WORKER ${workerIndex}] GEMINI FAIL keyIndex=${keyInfo.keyIndex} model=${model} duration=${durationMs}ms error=${err.message}`
    );

    throw err;
  }
}

function callGeminiRoundRobin_(inputText) {
  const apiKey = getRoundRobinOrderedApiKeys_()[0];
  const model = getRoundRobinOrderedModels_()[0];

  const keyMasked = maskApiKey_(apiKey);
  const startedAt = Date.now();

  console.log(`[GEMINI SINGLE] START key=${keyMasked} model=${model}`);

  try {
    const result = callGeminiWithRetryPerModel_(model, apiKey, inputText);
    const durationMs = Date.now() - startedAt;

    console.log(`[GEMINI SINGLE] SUCCESS key=${keyMasked} model=${model} duration=${durationMs}ms`);

    result.__meta = {
      apiKey,
      model,
      durationMs
    };

    advanceApiKeyRoundRobinPointer_();
    advanceRoundRobinPointer_();

    return result;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const msg = String(err.message || '');

    console.log(`[GEMINI SINGLE] FAIL key=${keyMasked} model=${model} duration=${durationMs}ms error=${msg}`);

    err.__meta = {
      apiKey,
      model,
      durationMs
    };

    advanceApiKeyRoundRobinPointer_();
    advanceRoundRobinPointer_();

    throw err;
  }
}

function callGeminiBatchRoundRobin_(batchItems) {
  const apiKey = getRoundRobinOrderedApiKeys_()[0];
  const model = getRoundRobinOrderedModels_()[0];

  const keyMasked = maskApiKey_(apiKey);
  const startedAt = Date.now();

  console.log(`[GEMINI BATCH] START key=${keyMasked} model=${model} size=${batchItems.length}`);

  try {
    const result = callGeminiBatchWithRetryPerModel_(model, apiKey, batchItems);
    const durationMs = Date.now() - startedAt;

    console.log(`[GEMINI BATCH] SUCCESS key=${keyMasked} model=${model} size=${batchItems.length} duration=${durationMs}ms`);

    result.__meta = {
      apiKey,
      model,
      durationMs
    };

    advanceApiKeyRoundRobinPointer_();
    advanceRoundRobinPointer_();

    return result;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const msg = String(err.message || '');

    console.log(`[GEMINI BATCH] FAIL key=${keyMasked} model=${model} size=${batchItems.length} duration=${durationMs}ms error=${msg}`);

    err.__meta = {
      apiKey,
      model,
      durationMs
    };

    advanceApiKeyRoundRobinPointer_();
    advanceRoundRobinPointer_();

    throw err;
  }
}

function callGeminiWithRetryPerModel_(model, apiKey, inputText) {
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRY_ATTEMPTS_PER_MODEL; attempt++) {
    try {
      return callGeminiOnce_(model, apiKey, inputText);
    } catch (err) {
      const msg = String(err.message || '');

      console.log(`[GEMINI SINGLE] attempt=${attempt} failed model=${model} error=${msg}`);

      if (!isRetryableErrorMessage_(msg) || attempt === CONFIG.MAX_RETRY_ATTEMPTS_PER_MODEL) {
        throw err;
      }

      const jitter = Math.floor(Math.random() * 1000);
      const delay = Math.min(
        CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + jitter,
        12000
      );

      Utilities.sleep(delay);
    }
  }

  throw new Error(`Retry loop exited unexpectedly for model ${model}`);
}

function callGeminiBatchWithRetryPerModel_(model, apiKey, batchItems) {
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRY_ATTEMPTS_PER_MODEL; attempt++) {
    try {
      return callGeminiBatchOnce_(model, apiKey, batchItems);
    } catch (err) {
      const msg = String(err.message || '');

      console.log(`[GEMINI BATCH] attempt=${attempt} failed model=${model} size=${batchItems.length} error=${msg}`);

      if (!isRetryableErrorMessage_(msg) || attempt === CONFIG.MAX_RETRY_ATTEMPTS_PER_MODEL) {
        throw err;
      }

      const jitter = Math.floor(Math.random() * 1000);
      const delay = Math.min(
        CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + jitter,
        12000
      );

      Utilities.sleep(delay);
    }
  }

  throw new Error(`Batch retry loop exited unexpectedly for model ${model}`);
}

function callGeminiOnce_(model, apiKey, inputText) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) +
    ':generateContent?key=' +
    encodeURIComponent(apiKey);

  const prompt = [
    'Bạn là trợ lý xây dựng dữ liệu học Hán tự và từ vựng tiếng Trung cho người Việt.',
    '',
    `Đầu vào: ${inputText}`,
    '',
    'Nhiệm vụ:',
    '- Phân tích đầu vào là chữ đơn hay từ ghép.',
    '- Sinh toàn bộ dữ liệu học tập có cấu trúc.',
    '- Nếu có đa âm đọc hoặc đa nghĩa dễ gây nhầm lẫn, phải bật ambiguity_flag.',
    '',
    'Yêu cầu chung:',
    '- normalized_text là bản chuẩn hóa của đầu vào.',
    '- pinyin phải là pinyin có dấu.',
    '- meanings_vi là mảng nghĩa tiếng Việt ngắn gọn, dễ học.',
    '- han_viet: âm Hán Việt nếu có thể xác định hợp lý, nếu không chắc thì để rỗng.',
    '- traditional_variant: dạng phồn thể nếu có.',
    '',
    'PHẦN BỘ THỦ / THÀNH PHẦN:',
    '- main_radicals và component_breakdown[].main_radicals CHỈ ĐƯỢC chọn từ danh sách chuẩn sau, không được tự tạo cách hiển thị mới:',
    RADICAL_LIST.join(', '),
    '- Nếu là chữ đơn, hãy phân tích các thành phần cấu tạo quan trọng của chữ đó.',
    '- Nếu là từ ghép nhiều chữ, hãy phân tích từng chữ trong từ.',
    '- main_radicals là danh sách các bộ/thành phần chính liên quan toàn bộ từ/chữ.',
    '- component_breakdown là mảng phân tích từng chữ.',
    '- Với mỗi item trong component_breakdown:',
    '  + character: chữ đang phân tích',
    '  + components: các thành phần cấu tạo quan trọng',
    '  + main_radicals: các bộ/thành phần chính của chữ đó',
    '  + structure_type: một trong hinh_thanh, hoi_y, tuong_hinh, chi_su, gia_ta, khac, khong_ro',
    '  + structure_note: giải thích ngắn',
    '- radical_summary là mô tả ngắn gọn giúp người học hiểu cấu tạo của từ/chữ.',
    '- Không bịa thông tin từ nguyên nếu không chắc.',
    '',
    'PHẦN CẤU TẠO CHỮ VÀ MNEMONIC:',
    '- character_structure_type chỉ được chọn một trong các giá trị:',
    '  hinh_thanh, hoi_y, tuong_hinh, chi_su, gia_ta, khac, khong_ro',
    '- structure_explanation là giải thích ngắn về cấu tạo chữ/từ.',
    '- mnemonic là mẹo nhớ ngắn gọn, dễ học cho người Việt.',
    '- Nếu có thể, mnemonic nên tận dụng cấu tạo chữ như phần gợi nghĩa, gợi âm, hội ý, hình thanh.',
    '- Nếu không chắc về từ nguyên, hãy tạo mnemonic thực dụng phục vụ học tập, không khẳng định sai.',
    '',
    'HSK / TỪ LOẠI / TAG:',
    '- hsk_level phải là CHUỖI SỐ THUẦN hoặc rỗng.',
    '- Chỉ được trả về một trong các giá trị sau cho hsk_level: "", "1", "2", "3", "4", "5", "6", "7", "8", "9".',
    '- KHÔNG được trả về "HSK 1", "HSK1", "level 1" hoặc bất kỳ định dạng nào khác.',
    '- part_of_speech chỉ được dùng các nhãn:',
    '  danh_tu, dong_tu, tinh_tu, pho_tu, luong_tu, dai_tu, gioi_tu, tro_tu, so_tu, da_loai_tu, unknown',
    '- topic_tags CHỈ ĐƯỢC chọn từ danh sách sau, không tự tạo tag mới:',
    ALLOWED_TOPIC_TAGS.join(', '),
    '- Chỉ chọn tối đa 5 tag phù hợp nhất.',
    '',
    'VÍ DỤ:',
    '- examples là mảng string.',
    '- Mỗi item phải đúng format: CN=...|PY=...|VI=...',
    '- Ví dụ phải bám sát nghĩa chính và loại từ đã chọn.',
    '- Nếu có nhiều nghĩa chính hoặc nhiều loại từ quan trọng, hãy cố gắng cho ít nhất 1 ví dụ cho mỗi nghĩa hoặc mỗi loại từ quan trọng khi hợp lý.',
    '- Tổng số examples PHẢI ít nhất là 2.',
    '- Nếu mục chỉ có một nghĩa chính, vẫn phải cho ít nhất 2 ví dụ khác nhau.',
    '- Ví dụ phải ngắn, tự nhiên, dễ hiểu, không quá văn vẻ.',
    '',
    'TƯƠNG TỰ / MƠ HỒ:',
    '- similar_chars là các chữ/từ dễ nhầm.',
    '- source_confidence chỉ được là high, medium hoặc low.',
    '- review_status chỉ được là pending hoặc needs_review.',
    '- ambiguity_flag chỉ được là true hoặc false.',
    '- ambiguity_note giải thích ngắn khi ambiguity_flag=true.',
    '- reading_candidates là mảng string, mỗi item format: PINYIN=...|MEANINGS=...',
    '',
    'Ràng buộc quan trọng:',
    '- Nếu đầu vào có nhiều âm đọc hoặc nhiều nghĩa dễ gây nhầm lẫn, ưu tiên nghĩa phổ biến nhất cho bản ghi chính, nhưng phải bật ambiguity_flag=true.',
    '- Nếu ambiguity_flag=true thì review_status nên là needs_review.',
    '- Không markdown.',
    '- Chỉ trả về JSON hợp lệ.'
  ].join('\n');

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          normalized_text: { type: 'STRING' },
          pinyin: { type: 'STRING' },
          meanings_vi: { type: 'ARRAY', items: { type: 'STRING' } },
          han_viet: { type: 'STRING' },
          traditional_variant: { type: 'STRING' },
          main_radicals: { type: 'ARRAY', items: { type: 'STRING' } },
          component_breakdown: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                character: { type: 'STRING' },
                components: { type: 'ARRAY', items: { type: 'STRING' } },
                main_radicals: { type: 'ARRAY', items: { type: 'STRING' } },
                structure_type: { type: 'STRING' },
                structure_note: { type: 'STRING' }
              },
              required: [
                'character',
                'components',
                'main_radicals',
                'structure_type',
                'structure_note'
              ]
            }
          },
          radical_summary: { type: 'STRING' },
          hsk_level: { type: 'STRING' },
          part_of_speech: { type: 'ARRAY', items: { type: 'STRING' } },
          topic_tags: { type: 'ARRAY', items: { type: 'STRING' } },
          examples: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 2 },
          similar_chars: { type: 'ARRAY', items: { type: 'STRING' } },
          character_structure_type: { type: 'STRING' },
          structure_explanation: { type: 'STRING' },
          mnemonic: { type: 'STRING' },
          notes: { type: 'STRING' },
          source_confidence: { type: 'STRING' },
          ambiguity_flag: { type: 'BOOLEAN' },
          ambiguity_note: { type: 'STRING' },
          reading_candidates: { type: 'ARRAY', items: { type: 'STRING' } },
          review_status: { type: 'STRING' }
        },
        required: [
          'normalized_text',
          'pinyin',
          'meanings_vi',
          'han_viet',
          'traditional_variant',
          'main_radicals',
          'component_breakdown',
          'radical_summary',
          'hsk_level',
          'part_of_speech',
          'topic_tags',
          'examples',
          'similar_chars',
          'character_structure_type',
          'structure_explanation',
          'mnemonic',
          'notes',
          'source_confidence',
          'ambiguity_flag',
          'ambiguity_note',
          'reading_candidates',
          'review_status'
        ]
      }
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();
  const body = response.getContentText();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Gemini API error ${statusCode}: ${body}`);
  }

  const parsed = JSON.parse(body);
  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned empty content');
  }

  return JSON.parse(text);
}

function callGeminiBatchOnce_(model, apiKey, batchItems) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) +
    ':generateContent?key=' +
    encodeURIComponent(apiKey);

  const inputJson = JSON.stringify(
    batchItems.map(item => ({
      row_key: String(item.row_key),
      input_text: String(item.input_text || '').trim()
    }))
  );

  const prompt = [
    'Bạn là trợ lý xây dựng dữ liệu học Hán tự và từ vựng tiếng Trung cho người Việt.',
    '',
    'Bạn sẽ nhận một DANH SÁCH items.',
    'Hãy xử lý TỪNG item ĐỘC LẬP như thể mỗi item là một request riêng.',
    'Không được trộn thông tin giữa các items.',
    'Không được bỏ sót item nào.',
    'Không được thay đổi row_key.',
    '',
    'MỤC TIÊU:',
    '- Sinh dữ liệu học tập có cấu trúc cho từng item.',
    '- Kết quả phải phù hợp cho lưu trữ vào spreadsheet và thống kê sau này.',
    '',
    'QUY TẮC XỬ LÝ CHUNG CHO MỖI ITEM:',
    '- normalized_text là bản chuẩn hóa của input_text.',
    '- pinyin phải là pinyin có dấu.',
    '- meanings_vi là mảng nghĩa tiếng Việt ngắn gọn, rõ ràng, phục vụ học ngoại ngữ.',
    '- han_viet: âm Hán Việt nếu có thể xác định hợp lý; nếu không chắc thì để rỗng.',
    '- traditional_variant: dạng phồn thể nếu có; nếu không rõ thì để rỗng.',
    '',
    'PHẦN BỘ THỦ / THÀNH PHẦN:',
    '- main_radicals và component_breakdown[].main_radicals CHỈ ĐƯỢC chọn từ danh sách chuẩn sau, không được tự tạo cách hiển thị mới:',
    RADICAL_LIST.join(', '),
    '- main_radicals là danh sách các bộ/thành phần chính liên quan đến toàn bộ mục đang phân tích.',
    '- Nếu là chữ đơn, hãy phân tích các thành phần cấu tạo quan trọng của chữ đó.',
    '- Nếu là từ ghép nhiều chữ, hãy phân tích từng chữ vào component_breakdown.',
    '- component_breakdown là mảng phân tích từng chữ, với mỗi item gồm:',
    '  + character',
    '  + components',
    '  + main_radicals',
    '  + structure_type',
    '  + structure_note',
    '- radical_summary là mô tả ngắn giúp người học hiểu cấu tạo của mục đó.',
    '- Không khẳng định chắc chắn các phân tích từ nguyên nếu không đủ cơ sở.',
    '',
    'PHẦN CẤU TẠO CHỮ VÀ MNEMONIC:',
    '- character_structure_type chỉ được là:',
    '  hinh_thanh, hoi_y, tuong_hinh, chi_su, gia_ta, khac, khong_ro',
    '- structure_explanation là giải thích ngắn về cấu tạo tổng thể.',
    '- mnemonic là mẹo nhớ ngắn gọn, thực dụng cho người Việt.',
    '- Nếu có thể, mnemonic nên tận dụng cấu tạo chữ như phần gợi nghĩa, gợi âm, hội ý, hình thanh.',
    '',
    'HSK / TỪ LOẠI / TAG:',
    '- hsk_level phải là CHUỖI SỐ THUẦN hoặc rỗng.',
    '- Chỉ được trả về một trong các giá trị sau cho hsk_level: "", "1", "2", "3", "4", "5", "6", "7", "8", "9".',
    '- KHÔNG được trả về "HSK 1", "HSK1", "level 1" hoặc định dạng khác.',
    '- part_of_speech chỉ được dùng các nhãn:',
    '  danh_tu, dong_tu, tinh_tu, pho_tu, luong_tu, dai_tu, gioi_tu, tro_tu, so_tu, da_loai_tu, unknown',
    '- topic_tags CHỈ được chọn từ danh sách sau:',
    ALLOWED_TOPIC_TAGS.join(', '),
    '- Chỉ chọn tối đa 5 tag phù hợp nhất.',
    '',
    'VÍ DỤ:',
    '- examples là mảng string.',
    '- Mỗi item trong examples phải có đúng format: CN=...|PY=...|VI=...',
    '- Ví dụ phải bám sát nghĩa chính và loại từ đã chọn.',
    '- Nếu có nhiều nghĩa chính hoặc nhiều loại từ quan trọng, hãy cố gắng cho ít nhất 1 ví dụ cho mỗi nghĩa hoặc mỗi loại từ quan trọng khi hợp lý.',
    '- Tổng số examples cho MỖI item PHẢI ít nhất là 2.',
    '- Nếu item chỉ có một nghĩa chính, vẫn phải cho ít nhất 2 ví dụ khác nhau.',
    '- Ví dụ phải ngắn, tự nhiên, dễ hiểu.',
    '',
    'CHỮ/TỪ DỄ NHẦM:',
    '- similar_chars là các chữ/từ dễ nhầm về hình thức hoặc nghĩa.',
    '',
    'TRƯỜNG HỢP ĐA ÂM / ĐA NGHĨA:',
    '- Nếu item có nhiều âm đọc hoặc nhiều nghĩa dễ gây nhầm lẫn:',
    '  + chọn một nghĩa/âm đọc phổ biến nhất cho bản ghi chính',
    '  + đặt ambiguity_flag = true',
    '  + ghi ambiguity_note',
    '  + điền reading_candidates là mảng string format: PINYIN=...|MEANINGS=...',
    '- Nếu không mơ hồ đáng kể, ambiguity_flag = false, ambiguity_note = "", reading_candidates = []',
    '',
    'ĐỘ TIN CẬY VÀ REVIEW:',
    '- source_confidence chỉ được là high, medium, hoặc low',
    '- review_status chỉ được là pending hoặc needs_review',
    '- Nếu ambiguity_flag = true thì review_status nên là needs_review',
    '',
    'RÀNG BUỘC QUAN TRỌNG:',
    '- Mỗi item output phải giữ nguyên row_key từ input.',
    '- Không được bỏ sót bất kỳ row_key nào.',
    '- Không được thêm row_key không tồn tại trong input.',
    '- Không markdown.',
    '- Chỉ trả về JSON hợp lệ.',
    '',
    'DANH SÁCH INPUT ITEMS:',
    inputJson,
    '',
    'OUTPUT PHẢI CÓ ĐÚNG CẤU TRÚC SAU:',
    '{',
    '  "items": [',
    '    {',
    '      "row_key": "string",',
    '      "normalized_text": "string",',
    '      "pinyin": "string",',
    '      "meanings_vi": ["string"],',
    '      "han_viet": "string",',
    '      "traditional_variant": "string",',
    '      "main_radicals": ["string"],',
    '      "component_breakdown": [',
    '        {',
    '          "character": "string",',
    '          "components": ["string"],',
    '          "main_radicals": ["string"],',
    '          "structure_type": "string",',
    '          "structure_note": "string"',
    '        }',
    '      ],',
    '      "radical_summary": "string",',
    '      "hsk_level": "string",',
    '      "part_of_speech": ["string"],',
    '      "topic_tags": ["string"],',
    '      "examples": ["CN=...|PY=...|VI=..."],',
    '      "similar_chars": ["string"],',
    '      "character_structure_type": "string",',
    '      "structure_explanation": "string",',
    '      "mnemonic": "string",',
    '      "notes": "string",',
    '      "source_confidence": "high",',
    '      "ambiguity_flag": true,',
    '      "ambiguity_note": "string",',
    '      "reading_candidates": ["PINYIN=...|MEANINGS=..."],',
    '      "review_status": "pending"',
    '    }',
    '  ]',
    '}'
  ].join('\n');

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                row_key: { type: 'STRING' },
                normalized_text: { type: 'STRING' },
                pinyin: { type: 'STRING' },
                meanings_vi: { type: 'ARRAY', items: { type: 'STRING' } },
                han_viet: { type: 'STRING' },
                traditional_variant: { type: 'STRING' },
                main_radicals: { type: 'ARRAY', items: { type: 'STRING' } },
                component_breakdown: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      character: { type: 'STRING' },
                      components: { type: 'ARRAY', items: { type: 'STRING' } },
                      main_radicals: { type: 'ARRAY', items: { type: 'STRING' } },
                      structure_type: { type: 'STRING' },
                      structure_note: { type: 'STRING' }
                    },
                    required: [
                      'character',
                      'components',
                      'main_radicals',
                      'structure_type',
                      'structure_note'
                    ]
                  }
                },
                radical_summary: { type: 'STRING' },
                hsk_level: { type: 'STRING' },
                part_of_speech: { type: 'ARRAY', items: { type: 'STRING' } },
                topic_tags: { type: 'ARRAY', items: { type: 'STRING' } },
                examples: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 2 },
                similar_chars: { type: 'ARRAY', items: { type: 'STRING' } },
                character_structure_type: { type: 'STRING' },
                structure_explanation: { type: 'STRING' },
                mnemonic: { type: 'STRING' },
                notes: { type: 'STRING' },
                source_confidence: { type: 'STRING' },
                ambiguity_flag: { type: 'BOOLEAN' },
                ambiguity_note: { type: 'STRING' },
                reading_candidates: { type: 'ARRAY', items: { type: 'STRING' } },
                review_status: { type: 'STRING' }
              },
              required: [
                'row_key',
                'normalized_text',
                'pinyin',
                'meanings_vi',
                'han_viet',
                'traditional_variant',
                'main_radicals',
                'component_breakdown',
                'radical_summary',
                'hsk_level',
                'part_of_speech',
                'topic_tags',
                'examples',
                'similar_chars',
                'character_structure_type',
                'structure_explanation',
                'mnemonic',
                'notes',
                'source_confidence',
                'ambiguity_flag',
                'ambiguity_note',
                'reading_candidates',
                'review_status'
              ]
            }
          }
        },
        required: ['items']
      }
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();
  const body = response.getContentText();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Gemini batch API error ${statusCode}: ${body}`);
  }

  const parsed = JSON.parse(body);
  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini batch returned empty content');
  }

  return JSON.parse(text);
}