function onEdit(e) {
  if (!e || !e.range) return;

  const range = e.range;
  const sheet = range.getSheet();
  const kind = getSheetKind_(sheet);
  if (!kind) return;

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

  const isHanziInputEdit = kind === 'hanzi' && startCol <= CONFIG.COL_INPUT_TEXT && endCol >= CONFIG.COL_INPUT_TEXT;
  const isGrammarSourceEdit = kind === 'grammar' && startCol <= GRAMMAR_COL.RAW_HSK && endCol >= GRAMMAR_COL.RAW_TITLE;

  if (!isHanziInputEdit && !isGrammarSourceEdit) return;

  let affectedRows = 0;
  let singleRow = null;

  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    if (row <= CONFIG.HEADER_ROW) continue;
    
    markRowPending_(sheet, row);

    affectedRows++;
    if (numRows === 1 && numCols === 1) singleRow = row;
  }

  if (affectedRows === 1 && singleRow && CONFIG.ENABLE_INLINE_SINGLE_CELL_PROCESSING) {
    processInputRow(sheet, singleRow, false);
  }
}

function createEditTrigger() {
  deleteEditTriggers_();
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
}

function deleteEditTriggers_() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onEdit') ScriptApp.deleteTrigger(t);
  });
}

function createWorkerTriggers() {
  deleteWorkerTriggers_();
  const count = Math.min(CONFIG.WORKER_COUNT, 6);
  for (let i = 0; i < count; i++) {
    ScriptApp.newTrigger(`autoProcessPendingRowsWorker${i}`)
      .timeBased().everyMinutes(CONFIG.WORKER_TRIGGER_INTERVAL_MIN).create();
  }
}

function deleteWorkerTriggers_() {
  ScriptApp.getProjectTriggers().forEach(t => {
    const handler = t.getHandlerFunction();
    if (handler.startsWith('autoProcessPendingRowsWorker')) ScriptApp.deleteTrigger(t);
  });
}

function createRecoveryTrigger() {
  deleteRecoveryTriggers_();
  ScriptApp.newTrigger('recoverStaleProcessingRows')
    .timeBased().everyMinutes(CONFIG.RECOVERY_TRIGGER_INTERVAL_MIN).create();
}

function deleteRecoveryTriggers_() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'recoverStaleProcessingRows') ScriptApp.deleteTrigger(t);
  });
}

function installAllTriggers() {
  validateHeader_();
  createEditTrigger();
  createWorkerTriggers();
  createRecoveryTrigger();
}

function resetAllTriggers() {
  deleteEditTriggers_();
  deleteWorkerTriggers_();
  deleteRecoveryTriggers_();
  installAllTriggers();
}

function listProjectTriggersInfo() {
  const triggers = ScriptApp.getProjectTriggers();
  const info = triggers.map((t, i) => `${i+1}. ${t.getHandlerFunction()} | ${t.getEventType()}`).join('\n');
  SpreadsheetApp.getUi().alert(info || 'No triggers found.');
}
