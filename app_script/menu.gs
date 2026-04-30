function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Hanzi AI')
    .addItem('Process current row', 'processCurrentRow')
    .addItem('Process pending rows now', 'processPendingRows')
    .addItem('Retry failed rows', 'retryFailedRows')
    .addItem('Rebuild current row from AI', 'rebuildCurrentRow')
    .addSeparator()
    .addItem('Install auto pending trigger (5 min)', 'createAutoPendingTrigger')
    .addItem('Reset auto pending trigger', 'resetAutoPendingTrigger')
    .addItem('List project triggers', 'listProjectTriggersInfo')
    .addSeparator()
    .addItem('Approve current row', 'approveCurrentRow')
    .addItem('Mark current row needs review', 'markCurrentRowNeedsReview')
    .addItem('Mark current row pending', 'markCurrentRowPending')
    .addSeparator()
    .addItem('Preview parsed examples', 'previewParsedExamples')
    .addSeparator()
    .addItem('Show current model pointer', 'showCurrentModelPointer')
    .addItem('Reset model pointer', 'resetModelPointerMenu')
    .addItem('Show current API key pointer', 'showCurrentApiKeyPointer')
    .addItem('Reset API key pointer', 'resetApiKeyPointerMenu')
    .addToUi();
}

function processCurrentRow() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;
  processInputRow_(sheet, row, false);
}

function retryFailedRows() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);
  const lastRow = sheet.getLastRow();
  const startedAt = Date.now();
  let processedCount = 0;

  for (let row = CONFIG.HEADER_ROW + 1; row <= lastRow; row++) {
    if (processedCount >= CONFIG.BATCH_MAX_ROWS_PER_RUN) break;
    if (Date.now() - startedAt >= CONFIG.BATCH_MAX_RUNTIME_MS) break;

    const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
    const aiStatus = safeString_(sheet.getRange(row, CONFIG.COL_AI_STATUS).getValue());

    if (!inputText) continue;
    if (aiStatus !== 'retry_later') continue;

    processInputRow_(sheet, row, false);
    processedCount += 1;
    Utilities.sleep(CONFIG.BATCH_SLEEP_MS);
  }

  SpreadsheetApp.getUi().alert(`Retried ${processedCount} failed row(s).`);
}

function rebuildCurrentRow() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
  if (!inputText) return;

  clearCacheForInput_(inputText);
  markRowPending_(sheet, row);
  processInputRow_(sheet, row, true);
}

function approveCurrentRow() {
  const row = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET).getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;
  setReviewStatusForRow_(row, 'approved');
}

function markCurrentRowNeedsReview() {
  const row = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET).getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;
  setReviewStatusForRow_(row, 'needs_review');
}

function markCurrentRowPending() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;
  setReviewStatusForRow_(row, 'pending');
  markRowPending_(sheet, row);
}

function previewParsedExamples() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  const examplesText = safeString_(sheet.getRange(row, CONFIG.COL_EXAMPLES).getValue());
  const parsed = parseExamples_(examplesText);

  SpreadsheetApp.getUi().alert(
    parsed.length ? JSON.stringify(parsed, null, 2) : 'No examples found or invalid format.'
  );
}

function showCurrentModelPointer() {
  const models = getModelPool_();
  const idx = getRoundRobinIndex_() % models.length;
  const ordered = getRoundRobinOrderedModels_();

  SpreadsheetApp.getUi().alert(
    `Current RR index: ${idx}\nCurrent first model: ${models[idx]}\nOrder this turn: ${ordered.join(' -> ')}`
  );
}

function resetModelPointerMenu() {
  resetRoundRobinPointer_();
  SpreadsheetApp.getUi().alert('Round-robin model pointer has been reset to 0.');
}

function showCurrentApiKeyPointer() {
  const keys = getGeminiApiKeys_();
  const idx = getApiKeyRoundRobinIndex_() % keys.length;
  const ordered = getRoundRobinOrderedApiKeys_().map(maskApiKey_);

  SpreadsheetApp.getUi().alert(
    `Current API key RR index: ${idx}\n` +
    `Current first key: ${maskApiKey_(keys[idx])}\n` +
    `Order this turn: ${ordered.join(' -> ')}`
  );
}

function resetApiKeyPointerMenu() {
  resetApiKeyRoundRobinPointer_();
  SpreadsheetApp.getUi().alert('API key round-robin pointer has been reset to 0.');
}