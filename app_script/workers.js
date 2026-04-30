function autoProcessPendingRowsWorker0() { processWorker_(0); }
function autoProcessPendingRowsWorker1() { processWorker_(1); }
function autoProcessPendingRowsWorker2() { processWorker_(2); }
function autoProcessPendingRowsWorker3() { processWorker_(3); }
function autoProcessPendingRowsWorker4() { processWorker_(4); }
function autoProcessPendingRowsWorker5() { processWorker_(5); }
function autoProcessPendingRowsWorker6() { processWorker_(6); }
function autoProcessPendingRowsWorker7() { processWorker_(7); }
function autoProcessPendingRowsWorker8() { processWorker_(8); }
function autoProcessPendingRowsWorker9() { processWorker_(9); }
// có thể define thêm nếu cần max 10 worker

function processWorker_(workerIndex) {
  const keyCount = getGeminiApiKeyCount_();
  const workerCount = Math.min(CONFIG.WORKER_COUNT, keyCount);

  if (workerIndex >= workerCount) {
    console.log(`[WORKER ${workerIndex}] skipped: not active`);
    return;
  }

  console.log(`[WORKER ${workerIndex}] start`);

  const result = processPendingBatchForWorker_(workerIndex, workerCount);

  console.log(`[WORKER ${workerIndex}] done ${JSON.stringify(result)}`);
}