function recoverStaleProcessingRows() {
  validateConfig_();
  validateHeader_();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.CLAIM_LOCK_TIMEOUT_MS)) {
    console.log('[RECOVER] skipped: lock busy');
    return;
  }

  try {
    const sheet = getHanziSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow <= CONFIG.HEADER_ROW) {
      console.log('[RECOVER] skipped: no data rows');
      return;
    }

    const rowCount = lastRow - CONFIG.HEADER_ROW;
    const statuses = sheet
      .getRange(CONFIG.HEADER_ROW + 1, CONFIG.COL_AI_STATUS, rowCount, 1)
      .getValues();
    const updatedAts = sheet
      .getRange(CONFIG.HEADER_ROW + 1, CONFIG.COL_UPDATED_AT, rowCount, 1)
      .getValues();

    const staleRows = [];
    const thresholdMs = CONFIG.STALE_PROCESSING_MINUTES * 60 * 1000;
    const nowMs = Date.now();

    for (let index = 0; index < rowCount; index++) {
      const status = safeString_(statuses[index][0]);
      if (status !== 'processing') continue;

      const updatedAt = updatedAts[index][0];
      const updatedMs = updatedAt instanceof Date ? updatedAt.getTime() : 0;
      if (!updatedMs || nowMs - updatedMs > thresholdMs) {
        staleRows.push(CONFIG.HEADER_ROW + 1 + index);
      }
    }

    staleRows.forEach(row => {
      sheet
        .getRange(row, CONFIG.COL_AI_STATUS, 1, 2)
        .setValues([['retry_later', now_()]]);
      console.log(`[RECOVER] row=${row} processing -> retry_later`);
    });

    console.log(`[RECOVER] done recovered=${staleRows.length}`);
  } finally {
    lock.releaseLock();
  }
}
