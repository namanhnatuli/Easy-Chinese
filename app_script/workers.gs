function autoProcessPendingRowsWorker0() { processWorker_(0); }
function autoProcessPendingRowsWorker1() { processWorker_(1); }
function autoProcessPendingRowsWorker2() { processWorker_(2); }
function autoProcessPendingRowsWorker3() { processWorker_(3); }
function autoProcessPendingRowsWorker4() { processWorker_(4); }
function autoProcessPendingRowsWorker5() { processWorker_(5); }

function processWorker_(workerIndex) {
  validateHeader_();
  if (workerIndex >= CONFIG.WORKER_COUNT) return;

  console.log(`[WORKER ${workerIndex}] START`);
  let result;
  
  // Alternate between Hanzi and Grammar based on index
  if (workerIndex % 2 === 0) {
    result = processPendingQueueBatch({ source: 'worker', workerIndex, limit: CONFIG.AI_MICRO_BATCH_SIZE });
    if (!result.claimedRows?.length) {
      result = processPendingGrammarQueueBatch({ source: 'worker', workerIndex, limit: CONFIG.AI_MICRO_BATCH_SIZE });
    }
  } else {
    result = processPendingGrammarQueueBatch({ source: 'worker', workerIndex, limit: CONFIG.AI_MICRO_BATCH_SIZE });
    if (!result.claimedRows?.length) {
      result = processPendingQueueBatch({ source: 'worker', workerIndex, limit: CONFIG.AI_MICRO_BATCH_SIZE });
    }
  }

  console.log(`[WORKER ${workerIndex}] END`);
}
