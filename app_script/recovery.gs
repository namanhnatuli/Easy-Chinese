function recoverStaleProcessingRows() {
  validateHeader_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.CLAIM_LOCK_TIMEOUT_MS)) return;

  try {
    const hanziRecovered = recoverStaleRowsForSheet_(getHanziSheet_(), CONFIG.COL_AI_STATUS, CONFIG.COL_UPDATED_AT, 'Hanzi');
    const grammarRecovered = recoverStaleRowsForSheet_(getGrammarSheet_(), GRAMMAR_COL.AI_STATUS, GRAMMAR_COL.UPDATED_AT, 'Grammar');
    console.log(`[RECOVER] hanzi=${hanziRecovered} grammar=${grammarRecovered}`);
  } finally {
    lock.releaseLock();
  }
}

function recoverStaleRowsForSheet_(sheet, statusCol, updatedCol, label) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.HEADER_ROW) return 0;

  const rowCount = lastRow - CONFIG.HEADER_ROW;
  const statuses = sheet.getRange(CONFIG.HEADER_ROW + 1, statusCol, rowCount, 1).getValues();
  const updatedAts = sheet.getRange(CONFIG.HEADER_ROW + 1, updatedCol, rowCount, 1).getValues();

  const thresholdMs = CONFIG.STALE_PROCESSING_MINUTES * 60 * 1000;
  const nowMs = Date.now();
  const staleRows = [];

  for (let i = 0; i < rowCount; i++) {
    if (safeString_(statuses[i][0]) !== AI_STATUS.PROCESSING) continue;
    const updatedAt = updatedAts[i][0];
    const updatedMs = updatedAt instanceof Date ? updatedAt.getTime() : 0;
    if (!updatedMs || nowMs - updatedMs > thresholdMs) {
      staleRows.push(CONFIG.HEADER_ROW + 1 + i);
    }
  }

  staleRows.forEach(row => {
    sheet.getRange(row, statusCol, 1, 2).setValues([[AI_STATUS.RETRY_LATER, now_()]]);
    console.log(`[RECOVER] ${label} row=${row} processing -> retry_later`);
  });

  return staleRows.length;
}
