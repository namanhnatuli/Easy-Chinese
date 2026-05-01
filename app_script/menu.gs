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

  const { sheet } = getActiveSupportedSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  processInputRow_(sheet, row, false);
}

function rebuildCurrentRow() {
  ensureProjectSetup_();

  const { sheet, kind } = getActiveSupportedSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  if (kind === 'hanzi') {
    const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
    if (!inputText) return;
    clearCacheForInput_(inputText);
    markRowPending_(sheet, row);
  } else {
    const sourcePayload = getGrammarSourcePayload_(sheet, row);
    if (!sourcePayload.row_key) return;
    markGrammarRowPending_(sheet, row);
  }

  processInputRow_(sheet, row, true);
}

function approveCurrentRow() {
  const { sheet, kind } = getActiveSupportedSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;
  if (kind === 'hanzi') {
    setReviewStatusForRow_(row, 'approved');
  } else {
    setGrammarReviewStatusForRow_(row, 'approved');
  }
}

function markCurrentRowNeedsReview() {
  const { sheet, kind } = getActiveSupportedSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;
  if (kind === 'hanzi') {
    setReviewStatusForRow_(row, 'needs_review');
  } else {
    setGrammarReviewStatusForRow_(row, 'needs_review');
  }
}

function markCurrentRowPending() {
  const { sheet, kind } = getActiveSupportedSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  if (kind === 'hanzi') {
    setReviewStatusForRow_(row, 'pending');
    markRowPending_(sheet, row);
  } else {
    setGrammarReviewStatusForRow_(row, 'pending');
    markGrammarRowPending_(sheet, row);
  }
}

function previewParsedExamples() {
  const { sheet, kind } = getActiveSupportedSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  const examplesText = kind === 'hanzi'
    ? safeString_(sheet.getRange(row, CONFIG.COL_EXAMPLES).getValue())
    : safeString_(sheet.getRange(row, GRAMMAR_COL.EXAMPLES_STRUCTURED).getValue());
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
