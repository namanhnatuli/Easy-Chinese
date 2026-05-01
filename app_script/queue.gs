function claimPendingRows_(sheet, limit, workerIndex) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(CONFIG.CLAIM_LOCK_TIMEOUT_MS)) {
    console.log(`[QUEUE] worker=${workerIndex} claim skipped: lock busy`);
    return [];
  }

  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= CONFIG.HEADER_ROW) return [];

    const rowCount = lastRow - CONFIG.HEADER_ROW;
    const inputs = sheet
      .getRange(CONFIG.HEADER_ROW + 1, CONFIG.COL_INPUT_TEXT, rowCount, 1)
      .getValues();
    const statuses = sheet
      .getRange(CONFIG.HEADER_ROW + 1, CONFIG.COL_AI_STATUS, rowCount, 1)
      .getValues();

    const claimed = [];
    const claimedAt = now_();
    const claimWrites = [];

    for (let index = 0; index < rowCount && claimed.length < limit; index++) {
      const row = CONFIG.HEADER_ROW + 1 + index;
      const inputText = safeString_(inputs[index][0]);
      const aiStatus = safeString_(statuses[index][0]);

      if (!inputText) continue;
      if (!shouldProcessStatus_(aiStatus)) continue;

      claimed.push({
        row,
        row_key: String(row),
        input_text: inputText
      });

      claimWrites.push({
        row,
        values: [['processing', claimedAt]]
      });
    }

    claimWrites.forEach(write => {
      sheet
        .getRange(write.row, CONFIG.COL_AI_STATUS, 1, 2)
        .setValues(write.values);
    });

    if (claimWrites.length) {
      SpreadsheetApp.flush();
    }

    console.log(
      `[QUEUE] worker=${workerIndex} claimed=${claimed.length} rows=[${claimed.map(item => item.row).join(', ')}] flushed=${claimWrites.length > 0}`
    );

    return claimed;
  } finally {
    lock.releaseLock();
  }
}

function processClaimedRows_(sheet, claimedRows, context) {
  if (!claimedRows.length) {
    return { processed: 0, claimedRows: [] };
  }

  const workerIndex = context && context.workerIndex !== undefined ? context.workerIndex : 'manual';
  console.log(
    `[QUEUE] worker=${workerIndex} process start rows=[${claimedRows.map(item => item.row).join(', ')}]`
  );

  try {
    const response = generateBatchEntriesWithGemini_(claimedRows, context);
    const meta = response.__meta || {};
    const resultMap = buildResultMap_(response.items);

    let processed = 0;

    claimedRows.forEach(item => {
      const found = resultMap[item.row_key];
      if (!found) {
        console.log(`[QUEUE] worker=${workerIndex} missing output row=${item.row} -> retry_later`);
        writeAiRetryLater_(sheet, item.row, meta);
        return;
      }

      console.log(`[QUEUE] worker=${workerIndex} writing row=${item.row}`);
      writeAiResult_(sheet, item.row, found, meta);
      processed += 1;
    });

    console.log(
      `[QUEUE] worker=${workerIndex} process done processed=${processed} claimed=${claimedRows.length}`
    );

    return { processed, claimedRows };
  } catch (err) {
    const message = safeString_(err && err.message) || 'Unknown Gemini error';
    const meta = err.__meta || {};
    const retryable = isRetryableErrorMessage_(message);

    console.log(
      `[QUEUE] worker=${workerIndex} process fail retryable=${retryable} error=${message}`
    );

    claimedRows.forEach(item => {
      if (retryable) {
        console.log(`[QUEUE] worker=${workerIndex} row=${item.row} -> retry_later`);
        writeAiRetryLater_(sheet, item.row, meta);
      } else {
        console.log(`[QUEUE] worker=${workerIndex} row=${item.row} -> error`);
        writeAiError_(sheet, item.row, message, meta);
      }
    });

    return { processed: 0, claimedRows, error: message, retryable };
  }
}

function processPendingQueueBatch_(options) {
  options = options || {};
  validateConfig_();
  validateHeader_();

  const sheet = getHanziSheet_();
  const workerIndex =
    options.workerIndex !== undefined ? options.workerIndex : 'manual';
  const limit = options.limit || CONFIG.AI_MICRO_BATCH_SIZE;

  const claimedRows = claimPendingRows_(sheet, limit, workerIndex);
  if (!claimedRows.length) {
    console.log(`[QUEUE] worker=${workerIndex} no rows claimed`);
    return { processed: 0, claimedRows: [] };
  }

  return processClaimedRows_(sheet, claimedRows, options);
}

function processPendingRows() {
  let processed = 0;
  let batchCount = 0;

  while (batchCount < CONFIG.MANUAL_PROCESS_BATCH_LIMIT) {
    let result = processPendingQueueBatch_({
      source: 'manual',
      workerIndex: 'manual',
      limit: CONFIG.AI_MICRO_BATCH_SIZE
    });

    if (!result.claimedRows || !result.claimedRows.length) {
      result = processPendingGrammarQueueBatch_({
        source: 'manual',
        workerIndex: 'manual',
        limit: CONFIG.AI_MICRO_BATCH_SIZE
      });
    }

    if (!result.claimedRows || !result.claimedRows.length) {
      break;
    }

    processed += result.processed || 0;
    batchCount += 1;

    if (result.error) {
      break;
    }
  }

  SpreadsheetApp.getUi().alert(
    `Processed ${processed} row(s) across ${batchCount} micro-batch(es).`
  );

  return { processed, batchCount };
}

function hasPendingRows_() {
  const sheet = getHanziSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.HEADER_ROW) return false;

  const statuses = sheet
    .getRange(CONFIG.HEADER_ROW + 1, CONFIG.COL_AI_STATUS, lastRow - CONFIG.HEADER_ROW, 1)
    .getValues();

  return statuses.some(row => shouldProcessStatus_(row[0]));
}

function hasPendingGrammarRows_() {
  const sheet = getGrammarSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.HEADER_ROW) return false;

  const statuses = sheet
    .getRange(CONFIG.HEADER_ROW + 1, GRAMMAR_COL.AI_STATUS, lastRow - CONFIG.HEADER_ROW, 1)
    .getValues();

  return statuses.some(row => shouldProcessStatus_(row[0]));
}

function buildResultMap_(items) {
  const map = {};

  (Array.isArray(items) ? items : []).forEach(item => {
    const rowKey = safeString_(item && item.row_key);
    if (rowKey) {
      map[rowKey] = item;
    }
  });

  return map;
}
