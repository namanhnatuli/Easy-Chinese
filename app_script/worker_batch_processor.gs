function collectPendingRowsForWorker_(sheet, limit, workerIndex, workerCount) {
  const lastRow = sheet.getLastRow();
  const items = [];

  for (let row = CONFIG.HEADER_ROW + 1; row <= lastRow; row++) {
    if (items.length >= limit) break;

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

  // 🔥 LOG QUAN TRỌNG
  const rows = items.map(i => i.row);
  console.log(`[WORKER ${workerIndex}] collected rows: [${rows.join(', ')}]`);

  return items;
}

function processPendingBatchForWorker_(workerIndex) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);

  const batchItems = claimPendingRows_(
    sheet,
    CONFIG.AI_MICRO_BATCH_SIZE,
    workerIndex
  );

  if (!batchItems.length) {
    console.log(`[WORKER ${workerIndex}] no rows claimed`);
    return { processed: 0 };
  }

  console.log(
    `[WORKER ${workerIndex}] processing rows: ${batchItems.map(i => i.row).join(', ')}`
  );

  try {
    const result = generateBatchEntriesWithGeminiForWorker_(batchItems, workerIndex);
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
        console.log(`[WORKER ${workerIndex}] missing result for row ${batchItem.row}`);
        writeAiRetryLater_(sheet, batchItem.row, meta);
        return;
      }

      console.log(`[WORKER ${workerIndex}] writing row ${batchItem.row}`);

      writeAiResult_(sheet, batchItem.row, found, meta);
      processed++;
    });

    console.log(`[WORKER ${workerIndex}] batch done processed=${processed}`);

    return { processed };
  } catch (err) {
    const msg = String(err.message || '');
    const meta = err.__meta || {};

    console.log(`[WORKER ${workerIndex}] batch error: ${msg}`);

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