function getCacheSheet_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CONFIG.CACHE_SHEET);
  if (!sheet) throw new Error(`Missing sheet: ${CONFIG.CACHE_SHEET}`);
  return sheet;
}

function getCachedEntry_(inputText) {
  const cacheKey = normalizeInputKey_(inputText);
  if (!cacheKey) return null;

  const sheet = getCacheSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

  for (let i = 0; i < values.length; i++) {
    const rowKey = safeString_(values[i][0]);
    const rawJson = safeString_(values[i][1]);

    if (rowKey === cacheKey && rawJson) {
      return JSON.parse(rawJson);
    }
  }

  return null;
}

function upsertCachedEntry_(inputText, data) {
  const cacheKey = normalizeInputKey_(inputText);
  if (!cacheKey) return;

  const sheet = getCacheSheet_();
  const lastRow = sheet.getLastRow();
  const rawJson = JSON.stringify(data);

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

    for (let i = 0; i < values.length; i++) {
      const rowKey = safeString_(values[i][0]);
      if (rowKey === cacheKey) {
        sheet.getRange(i + 2, 1, 1, 3).setValues([[
          cacheKey,
          rawJson,
          now_(),
        ]]);
        return;
      }
    }
  }

  sheet.appendRow([cacheKey, rawJson, now_()]);
}

function clearCacheForInput_(inputText) {
  const cacheKey = normalizeInputKey_(inputText);
  if (!cacheKey) return;

  const sheet = getCacheSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();

  for (let i = values.length - 1; i >= 0; i--) {
    const rowKey = safeString_(values[i][0]);
    if (rowKey === cacheKey) {
      sheet.deleteRow(i + 2);
    }
  }
}
