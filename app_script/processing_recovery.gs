function recoverStaleProcessingRows() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);
  const lastRow = sheet.getLastRow();

  if (lastRow <= CONFIG.HEADER_ROW) return;

  const nowMs = Date.now();
  const maxAgeMs = CONFIG.STALE_PROCESSING_MINUTES * 60 * 1000;

  let recovered = 0;

  for (let row = CONFIG.HEADER_ROW + 1; row <= lastRow; row++) {
    const status = safeString_(sheet.getRange(row, CONFIG.COL_AI_STATUS).getValue());
    if (status !== 'processing') continue;

    const updatedAt = sheet.getRange(row, CONFIG.COL_UPDATED_AT).getValue();
    const updatedMs = updatedAt instanceof Date ? updatedAt.getTime() : 0;

    if (!updatedMs || nowMs - updatedMs > maxAgeMs) {
      sheet.getRange(row, CONFIG.COL_AI_STATUS).setValue('retry_later');
      updateTimestamp_(sheet, row);
      recovered++;
      console.log(`[RECOVER] row ${row} processing -> retry_later`);
    }
  }

  console.log(`[RECOVER] done recovered=${recovered}`);
}

function createRecoveryTrigger() {
  deleteRecoveryTriggers_();

  ScriptApp.newTrigger('recoverStaleProcessingRows')
    .timeBased()
    .everyMinutes(15)
    .create();
}

function deleteRecoveryTriggers_() {
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'recoverStaleProcessingRows') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}