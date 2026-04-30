function claimPendingRows_(sheet, limit, workerIndex) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(3000)) {
    console.log(`[WORKER ${workerIndex}] cannot acquire claim lock`);
    return [];
  }

  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= CONFIG.HEADER_ROW) return [];

    const rowCount = lastRow - CONFIG.HEADER_ROW;

    const inputs = sheet
      .getRange(CONFIG.HEADER_ROW + 1, CONFIG.COL_INPUT_TEXT, rowCount, 1)
      .getValues();

    const statuses = sheet
      .getRange(CONFIG.HEADER_ROW + 1, CONFIG.COL_AI_STATUS, rowCount, 1)
      .getValues();

    const claimed = [];

    for (let i = 0; i < rowCount; i++) {
      if (claimed.length >= limit) break;

      const row = CONFIG.HEADER_ROW + 1 + i;
      const inputText = safeString_(inputs[i][0]);
      const aiStatus = safeString_(statuses[i][0]);

      if (!inputText) continue;
      if (!shouldProcessStatus_(aiStatus)) continue;

      markRowProcessing_(sheet, row, workerIndex);

      claimed.push({
        row,
        row_key: String(row),
        input_text: inputText
      });
    }

    console.log(
      `[WORKER ${workerIndex}] claimed rows: [${claimed.map(x => x.row).join(', ')}]`
    );

    return claimed;
  } finally {
    lock.releaseLock();
  }
}