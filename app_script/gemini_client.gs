function callGeminiBatchWithRetry_(model, apiKey, batchItems) {
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRY_ATTEMPTS_PER_MODEL; attempt++) {
    try {
      return callGeminiBatchOnce_(model, apiKey, batchItems);
    } catch (err) {
      const message = safeString_(err && err.message);
      console.log(`[GEMINI BATCH] attempt=${attempt} model=${model} size=${batchItems.length} error=${message}`);
      
      if (!isRetryableErrorMessage_(message) || attempt >= CONFIG.MAX_RETRY_ATTEMPTS_PER_MODEL) {
        throw err;
      }

      const jitter = Math.floor(Math.random() * 400);
      const delay = Math.min(CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + jitter, CONFIG.MAX_RETRY_DELAY_MS);
      Utilities.sleep(delay);
    }
  }
  throw new Error(`Retry loop failed for model ${model}`);
}

function callGeminiBatchOnce_(model, apiKey, batchItems) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  const promptBuilder = resolveGeminiPromptBuilder_(batchItems);
  const responseSchemaBuilder = resolveGeminiResponseSchemaBuilder_(batchItems);

  const payload = {
    contents: [{ parts: [{ text: promptBuilder(batchItems) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: responseSchemaBuilder(),
      maxOutputTokens: 8192,
      temperature: 0.2
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
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
  const candidate = parsed?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  if (!text) {
    const finishReason = candidate?.finishReason;
    const blockReason = parsed?.promptFeedback?.blockReason;
    
    if (blockReason) throw new Error(`Gemini blocked prompt: ${blockReason}`);
    if (finishReason && finishReason !== 'STOP') throw new Error(`Gemini stopped early: ${finishReason}`);
    
    throw new Error('Gemini returned empty content (Safety filter or model error)');
  }

  let result;

  try {
    result = JSON.parse(text);
  } catch (err) {
    const finishReason = candidate?.finishReason || '';
    const textLength = text.length;
    const tail = text.slice(-500);

    console.log(
      `[GEMINI JSON PARSE ERROR] finishReason=${finishReason} length=${textLength} tail=${tail}`
    );

    throw new Error(
      `Gemini returned malformed JSON. finishReason=${finishReason}, length=${textLength}, parseError=${err.message}`
    );
  }

  if (Array.isArray(result.items)) {
    result.items = result.items.map(item => {
      item.senses = normalizeSenses_(item.senses, item);
      return item;
    });
  }

  return result;
}

function resolveGeminiPromptBuilder_(batchItems) {
  return (batchItems[0] && Object.prototype.hasOwnProperty.call(batchItems[0], 'raw_title'))
    ? buildGeminiGrammarBatchPrompt_
    : buildGeminiBatchPrompt_;
}

function resolveGeminiResponseSchemaBuilder_(batchItems) {
  return (batchItems[0] && Object.prototype.hasOwnProperty.call(batchItems[0], 'raw_title'))
    ? buildGeminiGrammarBatchResponseSchema_
    : buildGeminiBatchResponseSchema_;
}
