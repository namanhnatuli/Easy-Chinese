function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Hanzi AI')
    .addItem('Process current row', 'processCurrentRow')
    .addItem('Process pending rows now', 'processPendingRows')
    .addItem('Rebuild current row from AI', 'rebuildCurrentRow')
    .addSeparator()
    .addItem('Approve current row', 'approveCurrentRow')
    .addItem('Mark current row needs review', 'markCurrentRowNeedsReview')
    .addItem('Mark current row pending', 'markCurrentRowPending')
    .addItem('Preview parsed examples', 'previewParsedExamples')
    .addSeparator()
    .addItem('Install all triggers', 'installAllTriggers')
    .addItem('Reset all triggers', 'resetAllTriggers')
    .addItem('Create/reset worker triggers', 'resetWorkerTriggers')
    .addItem('Create/reset recovery trigger', 'createRecoveryTrigger')
    .addItem('List project triggers', 'listProjectTriggersInfo')
    .addSeparator()
    .addItem('Validate header/config', 'validateProjectSetup')
    .addToUi();
}

function processCurrentRow() {
  ensureProjectSetup_();

  const sheet = getHanziSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  processInputRow_(sheet, row, false);
}

function rebuildCurrentRow() {
  ensureProjectSetup_();

  const sheet = getHanziSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
  if (!inputText) return;

  clearCacheForInput_(inputText);
  markRowPending_(sheet, row);
  processInputRow_(sheet, row, true);
}

function approveCurrentRow() {
  const row = getHanziSheet_().getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;
  setReviewStatusForRow_(row, 'approved');
}

function markCurrentRowNeedsReview() {
  const row = getHanziSheet_().getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;
  setReviewStatusForRow_(row, 'needs_review');
}

function markCurrentRowPending() {
  const sheet = getHanziSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  setReviewStatusForRow_(row, 'pending');
  markRowPending_(sheet, row);
}

function previewParsedExamples() {
  const sheet = getHanziSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  const examplesText = safeString_(sheet.getRange(row, CONFIG.COL_EXAMPLES).getValue());
  const parsed = parseExamples_(examplesText);

  SpreadsheetApp.getUi().alert(
    parsed.length ? JSON.stringify(parsed, null, 2) : 'No examples found or invalid format.'
  );
}

function validateProjectSetup() {
  ensureProjectSetup_();
  SpreadsheetApp.getUi().alert('Header and config validation passed.');
}

function ensureProjectSetup_() {
  validateConfig_();
  validateHeader_();
}
