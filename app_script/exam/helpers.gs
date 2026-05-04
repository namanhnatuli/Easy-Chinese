function now_() {
  return new Date();
}

function safeString_(v) {
  return String(v || '').trim();
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function appendRows_(sheetName, rows) {
  if (!rows || !rows.length) return;

  const sheet = getSheet_(sheetName);
  const startRow = sheet.getLastRow() + 1;
  const width = rows[0].length;

  sheet.getRange(startRow, 1, rows.length, width).setValues(rows);
}

function findRowByFirstColumn_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (let i = 0; i < values.length; i++) {
    if (safeString_(values[i][0]) === id) return i + 2;
  }

  return -1;
}

function upsertRowByFirstColumn_(sheetName, id, rowValues) {
  const sheet = getSheet_(sheetName);
  const row = findRowByFirstColumn_(sheet, id);

  if (row > 0) {
    sheet.getRange(row, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function normalizeId_(text) {
  return safeString_(text)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}