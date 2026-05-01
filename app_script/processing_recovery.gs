function recoverStaleProcessingRows() {
  validateConfig_();
  validateHeader_();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.CLAIM_LOCK_TIMEOUT_MS)) {
    console.log('[RECOVER] skipped: lock busy');
    return;
  }

  try {
    const recoveredHanzi = recoverStaleRowsForSheet_(
      getHanziSheet_(),
      CONFIG.COL_AI_STATUS,
      CONFIG.COL_UPDATED_AT,
      'Hanzi'
    );
    const recoveredGrammar = recoverStaleRowsForSheet_(
      getGrammarSheet_(),
      GRAMMAR_COL.AI_STATUS,
      GRAMMAR_COL.UPDATED_AT,
      'NguPhap'
    );

    console.log(`[RECOVER] done recovered_hanzi=${recoveredHanzi} recovered_grammar=${recoveredGrammar}`);
  } finally {
    lock.releaseLock();
  }
}

function recoverStaleRowsForSheet_(sheet, statusColumn, updatedAtColumn, label) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.HEADER_ROW) {
    console.log(`[RECOVER] skipped ${label}: no data rows`);
    return 0;
  }

  const rowCount = lastRow - CONFIG.HEADER_ROW;
  const statuses = sheet
    .getRange(CONFIG.HEADER_ROW + 1, statusColumn, rowCount, 1)
    .getValues();
  const updatedAts = sheet
    .getRange(CONFIG.HEADER_ROW + 1, updatedAtColumn, rowCount, 1)
    .getValues();

  const thresholdMs = CONFIG.STALE_PROCESSING_MINUTES * 60 * 1000;
  const nowMs = Date.now();
  const staleRows = [];

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
      .getRange(row, statusColumn, 1, 2)
      .setValues([['retry_later', now_()]]);
    console.log(`[RECOVER] ${label} row=${row} processing -> retry_later`);
  });

  return staleRows.length;
}
