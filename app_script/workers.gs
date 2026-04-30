function autoProcessPendingRowsWorker0() { processWorker_(0); }
function autoProcessPendingRowsWorker1() { processWorker_(1); }
function autoProcessPendingRowsWorker2() { processWorker_(2); }
function autoProcessPendingRowsWorker3() { processWorker_(3); }
function autoProcessPendingRowsWorker4() { processWorker_(4); }
function autoProcessPendingRowsWorker5() { processWorker_(5); }
function autoProcessPendingRowsWorker6() { processWorker_(6); }

function processWorker_(workerIndex) {
  const keyCount = getGeminiApiKeyCount_();
  const workerCount = Math.min(CONFIG.WORKER_COUNT, keyCount);

  if (workerIndex >= workerCount) {
    console.log(`[WORKER ${workerIndex}] skipped: not active`);
    return;
  }

  console.log(`[WORKER ${workerIndex}] START`);

  const result = processPendingBatchForWorker_(workerIndex);

  console.log(`[WORKER ${workerIndex}] END result=${JSON.stringify(result)}`);
}