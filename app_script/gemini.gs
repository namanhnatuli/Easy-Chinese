function generateEntryWithGemini_(inputText, forceRefresh) {
  const normalizedInput = safeString_(inputText);
  if (!normalizedInput) {
    throw new Error('Input text is required');
  }

  if (!forceRefresh) {
    const cached = getCachedEntry_(normalizedInput);
    if (cached) {
      console.log(`[GEMINI SINGLE] cache hit input="${normalizedInput}"`);
      return cached;
    }
  }

  const response = generateBatchEntriesWithGemini_(
    [{ row_key: 'single', input_text: normalizedInput }],
    { source: 'single' }
  );

  const items = Array.isArray(response.items) ? response.items : [];
  const item = items.find(entry => safeString_(entry.row_key) === 'single');

  if (!item) {
    const error = new Error('Gemini returned no item for single request');
    error.__meta = response.__meta || {};
    throw error;
  }

  item.__meta = response.__meta || {};
  upsertCachedEntry_(normalizedInput, item);
  return item;
}

function generateBatchEntriesWithGemini_(batchItems, context) {
  const requestItems = normalizeBatchItems_(batchItems);
  if (!requestItems.length) {
    return { items: [], __meta: {} };
  }

  const route = takeNextGeminiRoute_();
  const startedAt = Date.now();
  const apiKeyMasked = maskApiKey_(route.apiKey);
  const source = safeString_(context && context.source) || 'batch';
  const workerLabel =
    context && context.workerIndex !== undefined ? ` worker=${context.workerIndex}` : '';

  console.log(
    `[GEMINI ${source.toUpperCase()}] START${workerLabel} key=${apiKeyMasked} model=${route.model} size=${requestItems.length}`
  );

  try {
    const response = callGeminiBatchWithRetry_(route.model, route.apiKey, requestItems);
    const durationMs = Date.now() - startedAt;

    response.__meta = {
      apiKey: route.apiKey,
      model: route.model,
      durationMs
    };

    console.log(
      `[GEMINI ${source.toUpperCase()}] SUCCESS${workerLabel} key=${apiKeyMasked} model=${route.model} duration=${durationMs}ms returned=${Array.isArray(response.items) ? response.items.length : 0}`
    );

    return response;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    err.__meta = {
      apiKey: route.apiKey,
      model: route.model,
      durationMs
    };

    console.log(
      `[GEMINI ${source.toUpperCase()}] FAIL${workerLabel} key=${apiKeyMasked} model=${route.model} duration=${durationMs}ms error=${err.message}`
    );

    throw err;
  }
}

function normalizeBatchItems_(batchItems) {
  if (!Array.isArray(batchItems)) return [];

  return batchItems
    .map(item => {
      const rowKey = safeString_(item && item.row_key);

      if (item && Object.prototype.hasOwnProperty.call(item, 'raw_title')) {
        return {
          row_key: rowKey,
          raw_title: safeString_(item.raw_title),
          raw_explanation: safeString_(item.raw_explanation),
          raw_examples: safeString_(item.raw_examples),
          raw_hsk: safeString_(item.raw_hsk)
        };
      }

      return {
        row_key: rowKey,
        input_text: safeString_(item && item.input_text)
      };
    })
    .filter(item => {
      if (!item.row_key) return false;
      if (Object.prototype.hasOwnProperty.call(item, 'raw_title')) {
        return !!(
          item.raw_title ||
          item.raw_explanation ||
          item.raw_examples ||
          item.raw_hsk
        );
      }

      return !!item.input_text;
    });
}

function getGeminiApiKeys_() {
  const props = PropertiesService.getScriptProperties();
  const rawMulti = safeString_(props.getProperty('GEMINI_API_KEYS'));

  if (rawMulti) {
    try {
      const parsed = JSON.parse(rawMulti);
      if (Array.isArray(parsed)) {
        const keys = parsed.map(value => safeString_(value)).filter(Boolean);
        if (keys.length) return keys;
      }
    } catch (err) {
      const splitKeys = rawMulti
        .split(/[\n,]+/)
        .map(value => safeString_(value))
        .filter(Boolean);

      if (splitKeys.length) return splitKeys;
    }
  }

  const fallbackKey = safeString_(props.getProperty('GEMINI_API_KEY'));
  if (fallbackKey) return [fallbackKey];

  throw new Error('Missing GEMINI_API_KEYS or GEMINI_API_KEY');
}

function getGeminiApiKeyCount_() {
  return getGeminiApiKeys_().length;
}

function maskApiKey_(key) {
  const value = safeString_(key);
  if (!value) return '';
  if (value.length <= 10) return '***';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getGeminiWeightedModels_() {
  const modelWeights = Array.isArray(CONFIG.GEMINI_MODEL_WEIGHTS)
    ? CONFIG.GEMINI_MODEL_WEIGHTS
    : [];

  const normalized = modelWeights
    .map(item => ({
      model: safeString_(item && item.model),
      weight: Math.max(0, Number(item && item.weight))
    }))
    .filter(item => item.model && item.weight > 0);

  if (!normalized.length) {
    throw new Error('CONFIG.GEMINI_MODEL_WEIGHTS must contain at least one positive weight');
  }

  return normalized;
}

function getGeminiModelWeightTotal_() {
  return getGeminiWeightedModels_().reduce((sum, item) => sum + item.weight, 0);
}

function getWeightedModelBySlot_(slot) {
  const models = getGeminiWeightedModels_();
  const totalWeight = getGeminiModelWeightTotal_();
  const normalizedSlot = ((slot % totalWeight) + totalWeight) % totalWeight;

  let cursor = 0;
  for (let index = 0; index < models.length; index++) {
    cursor += models[index].weight;
    if (normalizedSlot < cursor) {
      return {
        model: models[index].model,
        modelIndex: index,
        modelSlot: normalizedSlot
      };
    }
  }

  return {
    model: models[models.length - 1].model,
    modelIndex: models.length - 1,
    modelSlot: normalizedSlot
  };
}

function takeNextGeminiRoute_() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(CONFIG.ROUTE_LOCK_TIMEOUT_MS)) {
    throw new Error('Cannot acquire Gemini route lock');
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const keys = getGeminiApiKeys_();
    const totalWeight = getGeminiModelWeightTotal_();
    const state = parseRouteState_(props.getProperty(CONFIG.GEMINI_ROUTE_STATE_PROPERTY));

    const keyIndex = state.keyIndex % keys.length;
    const modelInfo = getWeightedModelBySlot_(state.modelSlot % totalWeight);

    const nextState = {
      keyIndex: (keyIndex + 1) % keys.length,
      modelSlot: (state.modelSlot + 1) % totalWeight
    };

    props.setProperty(CONFIG.GEMINI_ROUTE_STATE_PROPERTY, JSON.stringify(nextState));

    return {
      apiKey: keys[keyIndex],
      keyIndex,
      model: modelInfo.model,
      modelIndex: modelInfo.modelIndex,
      modelSlot: modelInfo.modelSlot
    };
  } finally {
    lock.releaseLock();
  }
}

function parseRouteState_(rawState) {
  if (!rawState) {
    return { keyIndex: 0, modelSlot: 0 };
  }

  try {
    const parsed = JSON.parse(rawState);
    return {
      keyIndex: Math.max(0, parseInt(parsed.keyIndex || 0, 10) || 0),
      modelSlot: Math.max(0, parseInt(parsed.modelSlot || 0, 10) || 0)
    };
  } catch (err) {
    return { keyIndex: 0, modelSlot: 0 };
  }
}

function resetGeminiRouteState_() {
  PropertiesService.getScriptProperties().setProperty(
    CONFIG.GEMINI_ROUTE_STATE_PROPERTY,
    JSON.stringify({ keyIndex: 0, modelSlot: 0 })
  );
}

function callGeminiBatchWithRetry_(model, apiKey, batchItems) {
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRY_ATTEMPTS_PER_MODEL; attempt++) {
    try {
      return callGeminiBatchOnce_(model, apiKey, batchItems);
    } catch (err) {
      const message = safeString_(err && err.message);

      console.log(
        `[GEMINI BATCH] attempt=${attempt} model=${model} size=${batchItems.length} error=${message}`
      );

      if (!isRetryableErrorMessage_(message) || attempt >= CONFIG.MAX_RETRY_ATTEMPTS_PER_MODEL) {
        throw err;
      }

      const jitter = Math.floor(Math.random() * 400);
      const delay = Math.min(
        CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + jitter,
        CONFIG.MAX_RETRY_DELAY_MS
      );

      Utilities.sleep(delay);
    }
  }

  throw new Error(`Retry loop exited unexpectedly for model ${model}`);
}

function callGeminiBatchOnce_(model, apiKey, batchItems) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) +
    ':generateContent?key=' +
    encodeURIComponent(apiKey);

  const promptBuilder = resolveGeminiPromptBuilder_(batchItems);
  const responseSchemaBuilder = resolveGeminiResponseSchemaBuilder_(batchItems);

  const payload = {
    contents: [{ parts: [{ text: promptBuilder(batchItems) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: responseSchemaBuilder()
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
  const text = parsed &&
    parsed.candidates &&
    parsed.candidates[0] &&
    parsed.candidates[0].content &&
    parsed.candidates[0].content.parts &&
    parsed.candidates[0].content.parts[0] &&
    parsed.candidates[0].content.parts[0].text;

  if (!text) {
    throw new Error('Gemini batch returned empty content');
  }

  return JSON.parse(text);
}

function resolveGeminiPromptBuilder_(batchItems) {
  const firstItem = Array.isArray(batchItems) ? batchItems[0] : null;
  if (firstItem && Object.prototype.hasOwnProperty.call(firstItem, 'raw_title')) {
    return buildGeminiGrammarBatchPrompt_;
  }

  return buildGeminiBatchPrompt_;
}

function resolveGeminiResponseSchemaBuilder_(batchItems) {
  const firstItem = Array.isArray(batchItems) ? batchItems[0] : null;
  if (firstItem && Object.prototype.hasOwnProperty.call(firstItem, 'raw_title')) {
    return buildGeminiGrammarBatchResponseSchema_;
  }

  return buildGeminiBatchResponseSchema_;
}

function buildGeminiBatchPrompt_(batchItems) {
  const inputJson = JSON.stringify(batchItems);

  return [
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
    '- component_breakdown là mảng phân tích từng chữ, với mỗi item gồm character, components, main_radicals, structure_type, structure_note.',
    '- radical_summary là mô tả ngắn giúp người học hiểu cấu tạo của mục đó.',
    '- Không khẳng định chắc chắn các phân tích từ nguyên nếu không đủ cơ sở.',
    '',
    'PHẦN CẤU TẠO CHỮ VÀ MNEMONIC:',
    '- character_structure_type chỉ được là: hinh_thanh, hoi_y, tuong_hinh, chi_su, gia_ta, khac, khong_ro.',
    '- structure_explanation là giải thích ngắn về cấu tạo tổng thể.',
    '- mnemonic là mẹo nhớ ngắn gọn, thực dụng cho người Việt.',
    '',
    'HSK / TỪ LOẠI / TAG:',
    '- hsk_level phải là chuỗi số thuần hoặc rỗng, chỉ được là "", "1"..."9".',
    '- part_of_speech chỉ được dùng các nhãn: danh_tu, dong_tu, tinh_tu, pho_tu, luong_tu, dai_tu, gioi_tu, tro_tu, so_tu, da_loai_tu, unknown.',
    '- topic_tags CHỈ được chọn từ danh sách sau:',
    ALLOWED_TOPIC_TAGS.join(', '),
    '- Chỉ chọn tối đa 5 tag phù hợp nhất.',
    '',
    'VÍ DỤ:',
    '- examples là mảng string.',
    '- Mỗi item trong examples phải có đúng format: CN=...|PY=...|VI=...',
    '- Tổng số examples cho MỖI item PHẢI ít nhất là 2.',
    '- Ví dụ phải ngắn, tự nhiên, dễ hiểu.',
    '',
    'CHỮ/TỪ DỄ NHẦM:',
    '- similar_chars là các chữ/từ dễ nhầm về hình thức hoặc nghĩa.',
    '',
    'TRƯỜNG HỢP ĐA ÂM / ĐA NGHĨA:',
    '- Nếu item có nhiều âm đọc hoặc nhiều nghĩa dễ gây nhầm lẫn, chọn một nghĩa/âm đọc phổ biến nhất cho bản ghi chính nhưng phải đặt ambiguity_flag = true.',
    '- ambiguity_note giải thích ngắn.',
    '- reading_candidates là mảng string format: PINYIN=...|MEANINGS=...',
    '- Nếu không mơ hồ đáng kể, ambiguity_flag = false, ambiguity_note = "", reading_candidates = [].',
    '',
    'ĐỘ TIN CẬY VÀ REVIEW:',
    '- source_confidence chỉ được là high, medium, hoặc low.',
    '- review_status chỉ được là pending hoặc needs_review.',
    '- Nếu ambiguity_flag = true thì review_status nên là needs_review.',
    '',
    'RÀNG BUỘC QUAN TRỌNG:',
    '- Mỗi item output phải giữ nguyên row_key từ input.',
    '- Không được bỏ sót bất kỳ row_key nào.',
    '- Không được thêm row_key không tồn tại trong input.',
    '- Không markdown.',
    '- Chỉ trả về JSON hợp lệ.',
    '',
    'DANH SÁCH INPUT ITEMS:',
    inputJson
  ].join('\n');
}

function buildGeminiBatchResponseSchema_() {
  return {
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
  };
}

function buildGeminiGrammarBatchPrompt_(batchItems) {
  const inputJson = JSON.stringify(batchItems);

  return [
    'Bạn là trợ lý chuẩn hóa dữ liệu ngữ pháp tiếng Trung cho một ứng dụng học tiếng Trung dành cho người Việt.',
    '',
    'Bạn sẽ nhận danh sách các item ngữ pháp thô từ sheet Google Sheets.',
    'Mỗi item có các trường:',
    '- row_key',
    '- raw_title: tên điểm ngữ pháp thô',
    '- raw_explanation: giải thích thô',
    '- raw_examples: ví dụ thô',
    '- raw_hsk: HSK thô',
    '',
    'Mục tiêu: chuyển từng item sang cấu trúc phù hợp với schema grammar_points và grammar_examples.',
    '',
    'QUY TẮC CHO MỖI ITEM:',
    '- title: tiêu đề ngắn gọn, rõ ràng, phù hợp hiển thị trong app.',
    '- slug: slug tiếng Anh/không dấu, lowercase, nối bằng dấu gạch ngang.',
    '- structure_text: mẫu/cấu trúc ngữ pháp ngắn gọn, ví dụ như "什么 + danh từ" hoặc mẫu tương đương phù hợp.',
    '- explanation_vi: giải thích tiếng Việt rõ ràng, đã biên tập lại từ dữ liệu thô.',
    '- notes: ghi chú học tập ngắn gọn nếu hữu ích, nếu không có thì để rỗng.',
    '- examples: mảng object, mỗi object gồm:',
    '  + chinese_text',
    '  + pinyin',
    '  + vietnamese_meaning',
    '- Hãy tách và chuẩn hóa ví dụ thô thành ít nhất 2 examples nếu dữ liệu cho phép.',
    '- hsk_level: chỉ được là chuỗi số "", "1"..."9".',
    '- source_confidence: high, medium hoặc low.',
    '- ambiguity_flag: true hoặc false.',
    '- ambiguity_note: giải thích ngắn nếu ambiguity_flag=true.',
    '- review_status: pending hoặc needs_review.',
    '',
    'RÀNG BUỘC:',
    '- Không được bỏ sót row_key.',
    '- Không được thêm row_key ngoài input.',
    '- Không markdown.',
    '- Chỉ trả về JSON hợp lệ.',
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
                },
                required: ['chinese_text', 'pinyin', 'vietnamese_meaning']
              }
            },
            hsk_level: { type: 'STRING' },
            source_confidence: { type: 'STRING' },
            ambiguity_flag: { type: 'BOOLEAN' },
            ambiguity_note: { type: 'STRING' },
            review_status: { type: 'STRING' }
          },
          required: [
            'row_key',
            'title',
            'slug',
            'structure_text',
            'explanation_vi',
            'notes',
            'examples',
            'hsk_level',
            'source_confidence',
            'ambiguity_flag',
            'ambiguity_note',
            'review_status'
          ]
        }
      }
    },
    required: ['items']
  };
}
