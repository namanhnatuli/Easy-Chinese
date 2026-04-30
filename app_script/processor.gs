function processInputRow_(sheet, row, forceRefresh) {
  validateConfig_();
  validateHeader_();

  const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
  if (!inputText) return { processed: 0 };

  const existingStatus = safeString_(sheet.getRange(row, CONFIG.COL_AI_STATUS).getValue());
  if (!forceRefresh && safeString_(existingStatus) === 'processing') {
    console.log(`[ROW] skip row=${row} already processing`);
    return { processed: 0, skipped: true };
  }

  markRowInlineProcessing_(sheet, row);
  console.log(`[ROW] processing row=${row} forceRefresh=${!!forceRefresh}`);

  try {
    const result = generateEntryWithGemini_(inputText, !!forceRefresh);
    const meta = result.__meta || {};
    writeAiResult_(sheet, row, result, meta);
    console.log(`[ROW] success row=${row}`);
    return { processed: 1 };
  } catch (err) {
    const message = safeString_(err && err.message) || 'Unknown Gemini error';
    const meta = err.__meta || {};
    const retryable = isRetryableErrorMessage_(message);

    if (retryable) {
      console.log(`[ROW] retry_later row=${row} error=${message}`);
      writeAiRetryLater_(sheet, row, meta);
      return { processed: 0, retryLater: true };
    }

    console.log(`[ROW] error row=${row} error=${message}`);
    writeAiError_(sheet, row, message, meta);
    return { processed: 0, error: message };
  }
}

function markRowInlineProcessing_(sheet, row) {
  sheet
    .getRange(row, CONFIG.COL_AI_STATUS, 1, 2)
    .setValues([['processing', now_()]]);
}
