function onEdit(e) {
  if (!e || !e.range) return;

  const range = e.range;
  const sheet = range.getSheet();

  if (sheet.getName() !== CONFIG.HANZI_SHEET) return;

  const startRow = range.getRow();
  const startCol = range.getColumn();
  const numRows = range.getNumRows();
  const numCols = range.getNumColumns();
  const endCol = startCol + numCols - 1;

  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    if (row <= CONFIG.HEADER_ROW) continue;
    touchRowUpdatedAt_(sheet, row);
  }

  const inputCol = CONFIG.COL_INPUT_TEXT;
  if (!(inputCol >= startCol && inputCol <= endCol)) {
    return;
  }

  let affectedRows = 0;

  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    if (row <= CONFIG.HEADER_ROW) continue;

    const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
    if (!inputText) continue;

    markRowPending_(sheet, row);
    affectedRows++;
  }

  if (affectedRows > 0 && numRows <= CONFIG.INLINE_PASTE_THRESHOLD_ROWS && numCols === 1) {
    const row = startRow;

    if (row > CONFIG.HEADER_ROW) {
      const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());

      if (inputText) {
        processInputRow_(sheet, row, false);
      }
    }
  }
}

function createEditTrigger() {
  const ss = SpreadsheetApp.getActive();

  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
}

function resetEditTrigger() {
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  createEditTrigger();
}