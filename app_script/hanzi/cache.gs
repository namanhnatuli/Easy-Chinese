function getCacheSheet_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CONFIG.CACHE_SHEET);
  if (!sheet) throw new Error(`Missing sheet: ${CONFIG.CACHE_SHEET}`);
  return sheet;
}

function getCacheKey_(inputText) {
  const normalized = normalizeInputKey_(inputText);
  if (!normalized) return '';
  return `${VOCAB_SCHEMA_VERSION}:${normalized}`;
}

function getCachedEntry_(inputText) {
  const cacheKey = getCacheKey_(inputText);
  if (!cacheKey) return null;

  const sheet = getCacheSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  for (let i = 0; i < values.length; i++) {
    if (safeString_(values[i][0]) === cacheKey) {
      const rawJson = safeString_(values[i][1]);
      return rawJson ? JSON.parse(rawJson) : null;
    }
  }
  return null;
}

function upsertCachedEntry_(inputText, data) {
  const cacheKey = getCacheKey_(inputText);
  if (!cacheKey) return;

  const sheet = getCacheSheet_();
  const lastRow = sheet.getLastRow();
  const rawJson = JSON.stringify(data);
  const timestamp = now_();

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < values.length; i++) {
      if (safeString_(values[i][0]) === cacheKey) {
        sheet.getRange(i + 2, 1, 1, 3).setValues([[cacheKey, rawJson, timestamp]]);
        return;
      }
    }
  }
  sheet.appendRow([cacheKey, rawJson, timestamp]);
}

function clearCacheForInput_(inputText) {
  const cacheKey = getCacheKey_(inputText);
  if (!cacheKey) return;

  const sheet = getCacheSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (safeString_(values[i][0]) === cacheKey) {
      sheet.deleteRow(i + 2);
    }
  }
}
