function processGrammarInputRow_(sheet, row, forceRefresh) {
  validateConfig_();
  validateHeader_();

  const rawInput = getGrammarSourcePayload_(sheet, row);
  if (!rawInput.row_key) return { processed: 0 };

  const existingStatus = safeString_(sheet.getRange(row, GRAMMAR_COL.AI_STATUS).getValue());
  if (!forceRefresh && existingStatus === 'processing') {
    console.log(`[GRAMMAR] skip row=${row} already processing`);
    return { processed: 0, skipped: true };
  }

  markGrammarRowInlineProcessing_(sheet, row);
  console.log(`[GRAMMAR] processing row=${row} forceRefresh=${!!forceRefresh}`);

  try {
    const response = generateGrammarBatchEntriesWithGemini_([rawInput], {
      source: 'grammar-single'
    });
    const meta = response.__meta || {};
    const resultMap = buildResultMap_(response.items);
    const item = resultMap[rawInput.row_key];

    if (!item) {
      writeGrammarRetryLater_(sheet, row, meta);
      return { processed: 0, retryLater: true };
    }

    writeGrammarAiResult_(sheet, row, item, meta);
    console.log(`[GRAMMAR] success row=${row}`);
    return { processed: 1 };
  } catch (err) {
    const message = safeString_(err && err.message) || 'Unknown Gemini error';
    const meta = err.__meta || {};

    if (isRetryableErrorMessage_(message)) {
      console.log(`[GRAMMAR] retry_later row=${row} error=${message}`);
      writeGrammarRetryLater_(sheet, row, meta);
      return { processed: 0, retryLater: true };
    }

    console.log(`[GRAMMAR] error row=${row} error=${message}`);
    writeGrammarAiError_(sheet, row, message, meta);
    return { processed: 0, error: message };
  }
}

function claimPendingGrammarRows_(sheet, limit, workerIndex) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(CONFIG.CLAIM_LOCK_TIMEOUT_MS)) {
    console.log(`[GRAMMAR] worker=${workerIndex} claim skipped: lock busy`);
    return [];
  }

  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= CONFIG.HEADER_ROW) return [];

    const rowCount = lastRow - CONFIG.HEADER_ROW;
    const sourceValues = sheet
      .getRange(CONFIG.HEADER_ROW + 1, GRAMMAR_COL.RAW_TITLE, rowCount, 4)
      .getValues();
    const statuses = sheet
      .getRange(CONFIG.HEADER_ROW + 1, GRAMMAR_COL.AI_STATUS, rowCount, 1)
      .getValues();

    const claimed = [];
    const claimWrites = [];
    const claimedAt = now_();

    for (let index = 0; index < rowCount && claimed.length < limit; index++) {
      const row = CONFIG.HEADER_ROW + 1 + index;
      const aiStatus = safeString_(statuses[index][0]);
      const item = buildGrammarSourceItemFromValues_(row, sourceValues[index]);

      if (!item.row_key) continue;
      if (!shouldProcessStatus_(aiStatus)) continue;

      claimed.push(item);
      claimWrites.push({
        row,
        values: [['processing', claimedAt]]
      });
    }

    claimWrites.forEach(write => {
      sheet
        .getRange(write.row, GRAMMAR_COL.AI_STATUS, 1, 2)
        .setValues(write.values);
    });

    if (claimWrites.length) SpreadsheetApp.flush();

    console.log(
      `[GRAMMAR] worker=${workerIndex} claimed=${claimed.length} rows=[${claimed.map(item => item.row).join(', ')}]`
    );

    return claimed;
  } finally {
    lock.releaseLock();
  }
}

function processPendingGrammarQueueBatch_(options) {
  options = options || {};
  validateConfig_();
  validateHeader_();

  const sheet = getGrammarSheet_();
  const workerIndex =
    options.workerIndex !== undefined ? options.workerIndex : 'manual';
  const limit = options.limit || CONFIG.AI_MICRO_BATCH_SIZE;

  const claimedRows = claimPendingGrammarRows_(sheet, limit, workerIndex);
  if (!claimedRows.length) {
    console.log(`[GRAMMAR] worker=${workerIndex} no rows claimed`);
    return { processed: 0, claimedRows: [], kind: 'grammar' };
  }

  try {
    const response = generateGrammarBatchEntriesWithGemini_(claimedRows, options);
    const meta = response.__meta || {};
    const resultMap = buildResultMap_(response.items);
    let processed = 0;

    claimedRows.forEach(item => {
      const found = resultMap[item.row_key];
      if (!found) {
        console.log(`[GRAMMAR] worker=${workerIndex} missing output row=${item.row} -> retry_later`);
        writeGrammarRetryLater_(sheet, item.row, meta);
        return;
      }

      writeGrammarAiResult_(sheet, item.row, found, meta);
      processed += 1;
    });

    return { processed, claimedRows, kind: 'grammar' };
  } catch (err) {
    const message = safeString_(err && err.message) || 'Unknown Gemini error';
    const meta = err.__meta || {};
    const retryable = isRetryableErrorMessage_(message);

    claimedRows.forEach(item => {
      if (retryable) {
        writeGrammarRetryLater_(sheet, item.row, meta);
      } else {
        writeGrammarAiError_(sheet, item.row, message, meta);
      }
    });

    return { processed: 0, claimedRows, kind: 'grammar', error: message, retryable };
  }
}

function buildGrammarSourceItemFromValues_(row, values) {
  const title = safeString_(values[0]);
  const explanation = safeString_(values[1]);
  const examples = safeString_(values[2]);
  const rawHsk = safeString_(values[3]);

  if (!title && !explanation && !examples && !rawHsk) {
    return { row, row_key: '' };
  }

  return {
    row,
    row_key: String(row),
    raw_title: title,
    raw_explanation: explanation,
    raw_examples: examples,
    raw_hsk: rawHsk
  };
}

function getGrammarSourcePayload_(sheet, row) {
  const values = sheet.getRange(row, GRAMMAR_COL.RAW_TITLE, 1, 4).getValues()[0];
  return buildGrammarSourceItemFromValues_(row, values);
}

function markGrammarRowPending_(sheet, row, meta) {
  const timestamp = now_();
  const metaValues = buildGrammarExecutionMetaValues_(meta);

  sheet
    .getRange(row, GRAMMAR_COL.REVIEW_STATUS, 1, 6)
    .setValues([['pending', 'pending', timestamp].concat(metaValues)]);
}

function markGrammarRowInlineProcessing_(sheet, row) {
  sheet
    .getRange(row, GRAMMAR_COL.AI_STATUS, 1, 2)
    .setValues([['processing', now_()]]);
}

function writeGrammarAiResult_(sheet, row, data, meta) {
  const normalized = normalizeGrammarAiData_(data);
  const metaValues = buildGrammarExecutionMetaValues_(meta);

  const rowValues = [
    normalized.title,
    normalized.slug,
    normalized.structure_text,
    normalized.explanation_vi,
    normalized.notes,
    normalized.examples_structured,
    normalized.hsk_level,
    normalized.source_confidence,
    normalized.ambiguity_flag,
    normalized.ambiguity_note,
    normalized.review_status,
    'done',
    now_()
  ].concat(metaValues);

  sheet
    .getRange(row, GRAMMAR_COL.TITLE, 1, rowValues.length)
    .setValues([rowValues]);
}

function writeGrammarRetryLater_(sheet, row, meta) {
  const metaValues = buildGrammarExecutionMetaValues_(meta);
  sheet
    .getRange(row, GRAMMAR_COL.AI_STATUS, 1, 5)
    .setValues([['retry_later', now_()].concat(metaValues)]);
}

function writeGrammarAiError_(sheet, row, message, meta) {
  const metaValues = buildGrammarExecutionMetaValues_(meta);
  sheet
    .getRange(row, GRAMMAR_COL.AI_STATUS, 1, 5)
    .setValues([[buildErrorStatus_(message), now_()].concat(metaValues)]);
}

function setGrammarReviewStatusForRow_(row, status) {
  const sheet = getGrammarSheet_();
  const normalizedStatus = normalizeReviewStatus_(status);
  sheet
    .getRange(row, GRAMMAR_COL.REVIEW_STATUS, 1, 3)
    .setValues([[normalizedStatus, safeString_(sheet.getRange(row, GRAMMAR_COL.AI_STATUS).getValue()), now_()]]);
}

function buildGrammarExecutionMetaValues_(meta) {
  return [
    meta && meta.apiKey ? maskApiKey_(meta.apiKey) : '',
    safeString_(meta && meta.model),
    safeNumberOrBlank_(meta && meta.durationMs)
  ];
}

function normalizeGrammarAiData_(data) {
  const hskLevel = normalizeHskLevel_(data && data.hsk_level);
  const sourceConfidence = normalizeSourceConfidence_(data && data.source_confidence);
  const ambiguityFlag = normalizeBooleanString_(data && data.ambiguity_flag);
  const reviewStatus = normalizeReviewStatus_(data && data.review_status);
  const finalReviewStatus =
    ambiguityFlag === 'true' || sourceConfidence === 'low'
      ? 'needs_review'
      : reviewStatus;
  const title = safeString_(data && data.title);

  return {
    title,
    slug: slugify_(data && data.slug ? data.slug : title),
    structure_text: safeString_(data && data.structure_text),
    explanation_vi: safeString_(data && data.explanation_vi),
    notes: safeString_(data && data.notes),
    examples_structured: normalizeGrammarExamplesOutput_(data && data.examples),
    hsk_level: hskLevel || '',
    source_confidence: sourceConfidence,
    ambiguity_flag: ambiguityFlag,
    ambiguity_note: safeString_(data && data.ambiguity_note),
    review_status: finalReviewStatus
  };
}

function generateGrammarBatchEntriesWithGemini_(batchItems, context) {
  return generateBatchEntriesWithGemini_(batchItems, {
    source: context && context.source ? context.source : 'grammar',
    workerIndex: context && context.workerIndex,
    kind: 'grammar'
  });
}
