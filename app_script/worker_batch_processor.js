function collectPendingRowsForWorker_(sheet, limit, workerIndex, workerCount) {
  const lastRow = sheet.getLastRow();
  const items = [];

  for (let row = CONFIG.HEADER_ROW + 1; row <= lastRow; row++) {
    if (items.length >= limit) break;

    // chia shard theo row number
    if (row % workerCount !== workerIndex) continue;

    const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
    const aiStatus = safeString_(sheet.getRange(row, CONFIG.COL_AI_STATUS).getValue());

    if (!inputText) continue;
    if (!shouldProcessStatus_(aiStatus)) continue;

    items.push({
      row,
      row_key: String(row),
      input_text: inputText
    });
  }

  return items;
}

function processPendingBatchForWorker_(workerIndex, workerCount) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);

  const batchItems = collectPendingRowsForWorker_(
    sheet,
    CONFIG.AI_MICRO_BATCH_SIZE,
    workerIndex,
    workerCount
  );

  if (!batchItems.length) {
    console.log(`[WORKER ${workerIndex}] no pending rows`);
    return { processed: 0 };
  }

  try {
    const result = generateBatchEntriesWithGeminiForKey_(batchItems, workerIndex);
    const meta = result.__meta || {};
    const returnedItems = Array.isArray(result.items) ? result.items : [];

    const resultMap = {};
    returnedItems.forEach(item => {
      const key = safeString_(item.row_key);
      if (key) resultMap[key] = item;
    });

    let processed = 0;

    batchItems.forEach(batchItem => {
      const found = resultMap[batchItem.row_key];

      if (!found) {
        writeAiRetryLater_(sheet, batchItem.row, meta);
        return;
      }

      writeAiResult_(sheet, batchItem.row, found, meta);
      processed++;
    });

    return { processed };
  } catch (err) {
    const msg = String(err.message || '');
    const meta = err.__meta || {};

    batchItems.forEach(batchItem => {
      if (isRetryableErrorMessage_(msg)) {
        writeAiRetryLater_(sheet, batchItem.row, meta);
      } else {
        writeAiError_(sheet, batchItem.row, msg, meta);
      }
    });

    return { processed: 0 };
  }
}