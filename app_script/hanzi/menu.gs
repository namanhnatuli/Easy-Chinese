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
    .addSeparator()
    .addItem('Preview parsed examples', 'previewParsedExamples')
    .addItem('Preview parsed senses_json', 'previewParsedSenses')
    .addSeparator()
    .addItem('Install all triggers', 'installAllTriggers')
    .addItem('Reset all triggers', 'resetAllTriggers')
    .addItem('Create/reset worker triggers', 'resetWorkerTriggers')
    .addItem('Create/reset recovery trigger', 'resetRecoveryTrigger')
    .addItem('List project triggers', 'listProjectTriggersInfo')
    .addSeparator()
    .addItem('Validate header/config', 'validateProjectSetup')
    .addToUi();
}

function processCurrentRow() {
  const { sheet } = getActiveSupportedSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;
  processInputRow(sheet, row, false);
}

function rebuildCurrentRow() {
  const { sheet, kind } = getActiveSupportedSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  if (kind === 'hanzi') {
    const input = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
    if (input) clearCacheForInput_(input);
  }
  markRowPending_(sheet, row);
  processInputRow(sheet, row, true);
}

function approveCurrentRow() {
  setReviewStatusForRow_(REVIEW_STATUS.APPROVED);
}

function markCurrentRowNeedsReview() {
  setReviewStatusForRow_(REVIEW_STATUS.NEEDS_REVIEW);
}

function markCurrentRowPending() {
  setReviewStatusForRow_(REVIEW_STATUS.PENDING);
}

function setReviewStatusForRow_(status) {
  const { sheet, kind } = getActiveSupportedSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  const col = kind === 'grammar' ? GRAMMAR_COL.REVIEW_STATUS : CONFIG.COL_REVIEW_STATUS;
  const currentAiStatus = safeString_(sheet.getRange(row, kind === 'grammar' ? GRAMMAR_COL.AI_STATUS : CONFIG.COL_AI_STATUS).getValue());
  
  sheet.getRange(row, col, 1, 3).setValues([[status, currentAiStatus, now_()]]);
}

function previewParsedExamples() {
  const { sheet, kind } = getActiveSupportedSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  const col = kind === 'hanzi' ? CONFIG.COL_EXAMPLES : GRAMMAR_COL.EXAMPLES_STRUCTURED;
  const text = safeString_(sheet.getRange(row, col).getValue());
  const parsed = parseExamples_(text);
  SpreadsheetApp.getUi().alert(parsed.length ? JSON.stringify(parsed, null, 2) : 'No examples found.');
}

function previewParsedSenses() {
  const { sheet, kind } = getActiveSupportedSheet_();
  if (kind !== 'hanzi') {
    SpreadsheetApp.getUi().alert('Only available for Hanzi sheet.');
    return;
  }
  const row = sheet.getActiveRange().getRow();
  if (row <= CONFIG.HEADER_ROW) return;

  const text = safeString_(sheet.getRange(row, CONFIG.COL_SENSES_JSON).getValue());
  if (!text) {
    SpreadsheetApp.getUi().alert('No senses_json found.');
    return;
  }
  try {
    SpreadsheetApp.getUi().alert(JSON.stringify(JSON.parse(text), null, 2));
  } catch (e) {
    SpreadsheetApp.getUi().alert('Invalid JSON in senses_json column.');
  }
}

function validateProjectSetup() {
  try {
    validateHeader_();
    SpreadsheetApp.getUi().alert('Header and config validation passed.');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Validation failed: ' + e.message);
  }
}
