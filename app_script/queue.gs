function shouldProcessStatus_(aiStatus) {
  const status = safeString_(aiStatus);
  return status === 'pending' || status === 'retry_later';
}

function processPendingRowsCore_(options) {
  options = options || {};

  const showAlert = options.showAlert === true;
  const startedAt = Date.now();

  let processedCount = 0;
  let batchRuns = 0;

  console.log('[QUEUE] processPendingRowsCore START');

  while (true) {
    const elapsed = Date.now() - startedAt;
    const remaining = CONFIG.BATCH_MAX_RUNTIME_MS - elapsed;

    console.log(`[QUEUE] loop batchRuns=${batchRuns} processed=${processedCount} remaining=${remaining}ms`);

    if (remaining < 30000) {
      console.log('[QUEUE] stop: remaining time buffer too small');
      break;
    }

    if (batchRuns >= CONFIG.BATCH_MAX_ROWS_PER_RUN) {
      console.log('[QUEUE] stop: reached BATCH_MAX_ROWS_PER_RUN');
      break;
    }

    const result = processPendingBatch_();

    if (!result || !result.processed) {
      console.log('[QUEUE] stop: no processed rows');
      break;
    }

    processedCount += result.processed;
    batchRuns += 1;

    Utilities.sleep(CONFIG.BATCH_SLEEP_MS);
  }

  const summary = {
    processedCount,
    batchRuns,
    finishedAt: now_()
  };

  console.log('[QUEUE] DONE ' + JSON.stringify(summary));

  if (showAlert) {
    SpreadsheetApp.getUi().alert(
      `Processed ${processedCount} row(s) across ${batchRuns} batch call(s).`
    );
  }

  return summary;
}

function processPendingRows() {
  return processPendingRowsCore_({ showAlert: true });
}

function autoProcessPendingRows() {
  console.log('[AUTO] START ' + new Date().toISOString());

  if (!hasPendingRows_()) {
    console.log('[AUTO] END: no pending rows');
    return;
  }

  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(1000);

  if (!gotLock) {
    console.log('[AUTO] SKIP: previous run still active');
    return;
  }

  try {
    const result = processPendingRowsCore_({ showAlert: false });
    console.log('[AUTO] DONE: ' + JSON.stringify(result));
    return result;
  } catch (err) {
    console.error('[AUTO] ERROR: ' + err.stack);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function hasPendingRows_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);

  if (!sheet) {
    console.log('[AUTO] Sheet not found: ' + CONFIG.HANZI_SHEET);
    return false;
  }

  const lastRow = sheet.getLastRow();
  console.log('[AUTO] lastRow=' + lastRow);

  if (lastRow <= CONFIG.HEADER_ROW) return false;

  const values = sheet
    .getRange(CONFIG.HEADER_ROW + 1, CONFIG.COL_AI_STATUS, lastRow - CONFIG.HEADER_ROW, 1)
    .getValues();

  let pendingCount = 0;
  let retryCount = 0;

  values.forEach(row => {
    const status = safeString_(row[0]);
    if (status === 'pending') pendingCount++;
    if (status === 'retry_later') retryCount++;
  });

  console.log('[AUTO] pendingCount=' + pendingCount + ', retryCount=' + retryCount);

  return pendingCount > 0 || retryCount > 0;
}