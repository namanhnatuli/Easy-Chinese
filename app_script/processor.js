function processInputRow_(sheet, row, forceRefresh) {
  const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
  if (!inputText) return;

  try {
    const result = generateEntryWithGemini_(inputText, !!forceRefresh);
    const meta = result.__meta || {};

    writeAiResult_(sheet, row, result, meta);
  } catch (err) {
    const msg = String(err.message || '');
    const meta = err.__meta || {};

    if (isRetryableErrorMessage_(msg)) {
      writeAiRetryLater_(sheet, row, meta);
      return;
    }

    writeAiError_(sheet, row, msg, meta);
  }
}