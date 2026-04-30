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

  for (let offset = 0; offset < numRows; offset++) {
    const row = startRow + offset;
    if (row <= CONFIG.HEADER_ROW) continue;
    touchRowUpdatedAt_(sheet, row);
  }

  if (!(CONFIG.COL_INPUT_TEXT >= startCol && CONFIG.COL_INPUT_TEXT <= endCol)) {
    return;
  }

  let affectedRows = 0;
  let singleTargetRow = null;

  for (let offset = 0; offset < numRows; offset++) {
    const row = startRow + offset;
    if (row <= CONFIG.HEADER_ROW) continue;

    const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
    if (!inputText) continue;

    markRowPending_(sheet, row);
    affectedRows += 1;
    if (numRows === 1 && numCols === 1) {
      singleTargetRow = row;
    }
  }

  if (
    affectedRows === 1 &&
    singleTargetRow &&
    numRows <= CONFIG.INLINE_PASTE_THRESHOLD_ROWS &&
    numCols === 1 &&
    CONFIG.ENABLE_INLINE_SINGLE_CELL_PROCESSING
  ) {
    processInputRow_(sheet, singleTargetRow, false);
  }
}

function createEditTrigger() {
  const ss = SpreadsheetApp.getActive();

  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
}

function deleteEditTriggers_() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function resetEditTrigger() {
  deleteEditTriggers_();
  createEditTrigger();
}

function createWorkerTriggers() {
  deleteWorkerTriggers_();

  const workerCount = Math.min(CONFIG.WORKER_COUNT, getGeminiApiKeyCount_());
  console.log(`[TRIGGER] create worker triggers count=${workerCount}`);

  for (let index = 0; index < workerCount; index++) {
    ScriptApp.newTrigger(`autoProcessPendingRowsWorker${index}`)
      .timeBased()
      .everyMinutes(CONFIG.WORKER_TRIGGER_INTERVAL_MIN)
      .create();
  }
}

function deleteWorkerTriggers_() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    const handler = trigger.getHandlerFunction();
    if (handler.indexOf('autoProcessPendingRowsWorker') === 0) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function resetWorkerTriggers() {
  deleteWorkerTriggers_();
  createWorkerTriggers();
}

function createRecoveryTrigger() {
  deleteRecoveryTriggers_();

  ScriptApp.newTrigger('recoverStaleProcessingRows')
    .timeBased()
    .everyMinutes(CONFIG.RECOVERY_TRIGGER_INTERVAL_MIN)
    .create();
}

function deleteRecoveryTriggers_() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'recoverStaleProcessingRows') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function resetRecoveryTrigger() {
  deleteRecoveryTriggers_();
  createRecoveryTrigger();
}

function installAllTriggers() {
  validateConfig_();
  createWorkerTriggers();
  createRecoveryTrigger();
}

function resetAllTriggers() {
  deleteWorkerTriggers_();
  deleteRecoveryTriggers_();
  installAllTriggers();
}

function listProjectTriggersInfo() {
  const triggers = ScriptApp.getProjectTriggers();
  const lines = triggers.map((trigger, index) => {
    return `${index + 1}. ${trigger.getHandlerFunction()} | ${trigger.getEventType()} | ${trigger.getTriggerSource()}`;
  });

  SpreadsheetApp.getUi().alert(
    lines.length ? lines.join('\n') : 'No project triggers found.'
  );
}
