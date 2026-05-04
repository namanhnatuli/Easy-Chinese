function getHanziSheet_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CONFIG.HANZI_SHEET);
  if (!sheet) throw new Error(`Missing sheet: ${CONFIG.HANZI_SHEET}`);
  return sheet;
}

function getGrammarSheet_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CONFIG.GRAMMAR_SHEET);
  if (!sheet) throw new Error(`Missing sheet: ${CONFIG.GRAMMAR_SHEET}`);
  return sheet;
}

function getSheetKind_(sheet) {
  const name = typeof sheet === 'string' ? sheet : sheet.getName();
  if (name === CONFIG.HANZI_SHEET) return 'hanzi';
  if (name === CONFIG.GRAMMAR_SHEET) return 'grammar';
  return '';
}

function getActiveSupportedSheet_() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const kind = getSheetKind_(sheet);
  if (!kind) throw new Error(`Unsupported sheet: ${sheet.getName()}`);
  return { sheet, kind };
}

function getGrammarSourcePayload_(sheet, row) {
  const values = sheet.getRange(row, GRAMMAR_COL.RAW_TITLE, 1, 4).getValues()[0];
  const title = safeString_(values[0]);
  if (!title && !safeString_(values[1]) && !safeString_(values[2])) return { row, row_key: '' };
  return {
    row,
    row_key: String(row),
    raw_title: title,
    raw_explanation: safeString_(values[1]),
    raw_examples: safeString_(values[2]),
    raw_hsk: safeString_(values[3])
  };
}

function validateSheetHeader_(sheet, expectedHeaders, width, label) {
  const actualHeaders = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, width).getValues()[0].map(v => safeString_(v));
  const mismatches = [];
  expectedHeaders.forEach((expected, i) => {
    if (actualHeaders[i] !== expected) {
      mismatches.push(`col ${i + 1}: expected "${expected}", got "${actualHeaders[i]}"`);
    }
  });
  if (mismatches.length) throw new Error(`${label} header mismatch:\n${mismatches.join('\n')}`);
}

function validateHeader_() {
  validateSheetHeader_(getHanziSheet_(), HANZI_HEADERS, CONFIG.HEADER_WIDTH, 'Hanzi');
  validateSheetHeader_(getGrammarSheet_(), GRAMMAR_HEADERS, CONFIG.GRAMMAR_HEADER_WIDTH, 'NguPhap');
}
