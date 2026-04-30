function collectPendingRowsForBatch_(sheet, limit) {
  const lastRow = sheet.getLastRow();
  const items = [];

  console.log(`[BATCH] collect start lastRow=${lastRow} limit=${limit}`);

  for (let row = CONFIG.HEADER_ROW + 1; row <= lastRow; row++) {
    if (items.length >= limit) break;

    const inputText = safeString_(sheet.getRange(row, CONFIG.COL_INPUT_TEXT).getValue());
    const aiStatus = safeString_(sheet.getRange(row, CONFIG.COL_AI_STATUS).getValue());

    if (!inputText) continue;
    if (!shouldProcessStatus_(aiStatus)) continue;

    items.push({
      row: row,
      row_key: String(row),
      input_text: inputText
    });
  }

  console.log(`[BATCH] collected size=${items.length}`);

  return items;
}

function processPendingBatch_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);
  const batchItems = collectPendingRowsForBatch_(sheet, CONFIG.AI_MICRO_BATCH_SIZE);

  if (!batchItems.length) {
    console.log('[BATCH] no pending items');
    return { processed: 0, message: 'No pending rows.' };
  }

  console.log(`[BATCH] process start size=${batchItems.length}`);

  try {
    const result = generateBatchEntriesWithGemini_(batchItems);
    const meta = result.__meta || {};
    const returnedItems = Array.isArray(result.items) ? result.items : [];

    const resultMap = {};
    returnedItems.forEach(item => {
      const key = safeString_(item.row_key);
      if (key) resultMap[key] = item;
    });

    let processed = 0;

    batchItems.forEach(batchItem => {
      const row = batchItem.row;
      const found = resultMap[String(batchItem.row_key)];

      if (!found) {
        console.log(`[BATCH] missing result row=${row}`);
        writeAiRetryLater_(sheet, row, meta);
        return;
      }

      writeAiResult_(sheet, row, found, meta);
      processed += 1;
    });

    console.log(`[BATCH] process done processed=${processed}`);

    return { processed: processed, message: `Processed ${processed} rows.` };
  } catch (err) {
    const msg = String(err.message || '');
    const meta = err.__meta || {};

    console.log(`[BATCH] process error=${msg}`);

    batchItems.forEach(batchItem => {
      if (isRetryableErrorMessage_(msg)) {
        writeAiRetryLater_(sheet, batchItem.row, meta);
      } else {
        writeAiError_(sheet, batchItem.row, msg, meta);
      }
    });

    return { processed: 0, message: msg };
  }
}