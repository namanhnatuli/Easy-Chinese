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