function claimPendingRows_(sheet, limit, workerIndex) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.CLAIM_LOCK_TIMEOUT_MS)) {
    console.log(`[QUEUE] worker=${workerIndex} claim skipped: lock busy`);
    return [];
  }

  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= CONFIG.HEADER_ROW) return [];

    const kind = getSheetKind_(sheet);
    const inputCol = kind === 'grammar' ? GRAMMAR_COL.RAW_TITLE : CONFIG.COL_INPUT_TEXT;
    const statusCol = kind === 'grammar' ? GRAMMAR_COL.AI_STATUS : CONFIG.COL_AI_STATUS;
    const rowCount = lastRow - CONFIG.HEADER_ROW;

    const inputs = sheet.getRange(CONFIG.HEADER_ROW + 1, inputCol, rowCount, 1).getValues();
    const statuses = sheet.getRange(CONFIG.HEADER_ROW + 1, statusCol, rowCount, 1).getValues();

    const claimed = [];
    const claimedAt = now_();

    for (let i = 0; i < rowCount && claimed.length < limit; i++) {
      const row = CONFIG.HEADER_ROW + 1 + i;
      const status = safeString_(statuses[i][0]);
      const inputText = safeString_(inputs[i][0]);

      if (!inputText || (status !== AI_STATUS.PENDING && status !== AI_STATUS.RETRY_LATER)) continue;

      claimed.push({ row, row_key: String(row), input_text: inputText });
      sheet.getRange(row, statusCol, 1, 2).setValues([[AI_STATUS.PROCESSING, claimedAt]]);
    }

    if (claimed.length) SpreadsheetApp.flush();
    console.log(`[QUEUE] worker=${workerIndex} kind=${kind} claimed=${claimed.length}`);
    return claimed;
  } finally {
    lock.releaseLock();
  }
}

function buildResultMap_(items) {
  const map = {};
  (Array.isArray(items) ? items : []).forEach(item => {
    if (item?.row_key) map[item.row_key] = item;
  });
  return map;
}

function processPendingRows() {
  let processed = 0;
  let batchCount = 0;

  while (batchCount < CONFIG.MANUAL_PROCESS_BATCH_LIMIT) {
    let result = processPendingQueueBatch({ source: 'manual', limit: CONFIG.AI_MICRO_BATCH_SIZE });
    if (!result.claimedRows?.length) {
      result = processPendingGrammarQueueBatch({ source: 'manual', limit: CONFIG.AI_MICRO_BATCH_SIZE });
    }
    if (!result.claimedRows?.length) break;

    processed += result.processed || 0;
    batchCount += 1;
    if (result.error) break;
  }

  SpreadsheetApp.getUi().alert(`Processed ${processed} row(s) across ${batchCount} batch(es).`);
  return { processed, batchCount };
}
