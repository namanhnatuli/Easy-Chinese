function processInputRow(sheet, row, forceRefresh) {
  validateHeader_();
  if (getSheetKind_(sheet) === 'grammar') return processGrammarInputRow(sheet, row, forceRefresh);

  const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
  if (!inputText) return { processed: 0 };

  const existingStatus = safeString_(sheet.getRange(row, CONFIG.COL_AI_STATUS).getValue());
  if (!forceRefresh && existingStatus === AI_STATUS.PROCESSING) {
    console.log(`[VOCAB] skip row=${row} already processing`);
    return { processed: 0, skipped: true };
  }

  sheet.getRange(row, CONFIG.COL_AI_STATUS, 1, 2).setValues([[AI_STATUS.PROCESSING, now_()]]);

  try {
    let result = !forceRefresh ? getCachedEntry_(inputText) : null;
    let meta = {};

    if (!result) {
      const route = takeNextGeminiRoute_();
      const startedAt = Date.now();
      const response = callGeminiBatchWithRetry_(route.model, route.apiKey, [{ row_key: 'single', input_text: inputText }]);
      result = (response.items || []).find(item => item.row_key === 'single');
      if (!result) throw new Error('Gemini returned no item');
      
      meta = { apiKey: route.apiKey, model: route.model, durationMs: Date.now() - startedAt };
      upsertCachedEntry_(inputText, result);
    }

    writeAiResult_(sheet, row, result, meta);
    return { processed: 1 };
  } catch (err) {
    const message = safeString_(err.message);
    const retryable = isRetryableErrorMessage_(message);
    if (retryable) {
      writeAiRetryLater_(sheet, row, err.__meta || {});
      return { processed: 0, retryLater: true };
    }
    writeAiError_(sheet, row, message, err.__meta || {});
    return { processed: 0, error: message };
  }
}

function processPendingQueueBatch(options) {
  options = options || {};
  const sheet = getHanziSheet_();
  const workerIndex = options.workerIndex !== undefined ? options.workerIndex : 'manual';
  const limit = options.limit || CONFIG.AI_MICRO_BATCH_SIZE;

  const claimedRows = claimPendingRows_(sheet, limit, workerIndex);
  if (!claimedRows.length) return { processed: 0, claimedRows: [] };

  try {
    const route = takeNextGeminiRoute_();
    const startedAt = Date.now();
    const response = callGeminiBatchWithRetry_(route.model, route.apiKey, claimedRows);
    const meta = { apiKey: route.apiKey, model: route.model, durationMs: Date.now() - startedAt };
    const resultMap = buildResultMap_(response.items);

    let processed = 0;
    claimedRows.forEach(item => {
      console.log(`[VOCAB] processing row=${item.row} text="${item.input_text}"`);
      const found = resultMap[item.row_key];
      if (found) {
        writeAiResult_(sheet, item.row, found, meta);
        processed++;
      } else {
        writeAiRetryLater_(sheet, item.row, meta);
      }
    });

    return { processed, claimedRows };
  } catch (err) {
    const message = safeString_(err.message);
    const retryable = isRetryableErrorMessage_(message);
    claimedRows.forEach(item => {
      if (retryable) writeAiRetryLater_(sheet, item.row, err.__meta || {});
      else writeAiError_(sheet, item.row, message, err.__meta || {});
    });
    return { processed: 0, claimedRows, error: message, retryable };
  }
}

function processGrammarInputRow(sheet, row, forceRefresh) {
  validateHeader_();
  const rawTitle = safeString_(sheet.getRange(row, GRAMMAR_COL.RAW_TITLE).getValue());
  if (!rawTitle) return { processed: 0 };

  sheet.getRange(row, GRAMMAR_COL.AI_STATUS, 1, 2).setValues([[AI_STATUS.PROCESSING, now_()]]);

  try {
    const route = takeNextGeminiRoute_();
    const startedAt = Date.now();
    const response = callGeminiBatchWithRetry_(route.model, route.apiKey, [{ row_key: 'single', raw_title: rawTitle }]);
    const result = (response.items || []).find(item => item.row_key === 'single');
    if (!result) throw new Error('Gemini returned no item');
    
    const meta = { apiKey: route.apiKey, model: route.model, durationMs: Date.now() - startedAt };
    writeAiResult_(sheet, row, result, meta);
    return { processed: 1 };
  } catch (err) {
    const message = safeString_(err.message);
    writeAiError_(sheet, row, message, err.__meta || {});
    return { processed: 0, error: message };
  }
}

function processPendingGrammarQueueBatch(options) {
  options = options || {};
  const sheet = getGrammarSheet_();
  const workerIndex = options.workerIndex !== undefined ? options.workerIndex : 'manual';
  const limit = options.limit || CONFIG.AI_MICRO_BATCH_SIZE;

  const claimedRows = claimPendingRows_(sheet, limit, workerIndex);
  if (!claimedRows.length) return { processed: 0, claimedRows: [] };

  try {
    const route = takeNextGeminiRoute_();
    const startedAt = Date.now();
    const response = callGeminiBatchWithRetry_(route.model, route.apiKey, claimedRows);
    const meta = { apiKey: route.apiKey, model: route.model, durationMs: Date.now() - startedAt };
    const resultMap = buildResultMap_(response.items);

    let processed = 0;
    claimedRows.forEach(item => {
      console.log(`[GRAMMAR] processing row=${item.row} text="${item.input_text}"`);
      const found = resultMap[item.row_key];
      if (found) {
        writeAiResult_(sheet, item.row, found, meta);
        processed++;
      } else {
        writeAiRetryLater_(sheet, item.row, meta);
      }
    });

    return { processed, claimedRows };
  } catch (err) {
    const message = safeString_(err.message);
    const retryable = isRetryableErrorMessage_(message);
    claimedRows.forEach(item => {
      if (retryable) writeAiRetryLater_(sheet, item.row, err.__meta || {});
      else writeAiError_(sheet, item.row, message, err.__meta || {});
    });
    return { processed: 0, claimedRows, error: message, retryable };
  }
}
