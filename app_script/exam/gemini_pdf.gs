function parsePendingPdfPagesWithGemini() {
  const sheet = getSheet_(CONFIG.SHEET_PDF_PAGES);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return;

  let processed = 0;

  for (let row = 2; row <= lastRow; row++) {
    if (processed >= CONFIG.PDF_PARSE_BATCH_SIZE) break;

    const values = sheet.getRange(row, 1, 1, 11).getValues()[0];

    const examSetId = safeString_(values[0]);
    const pdfFileId = safeString_(values[1]);
    const pageNo = Number(values[2]);
    const partKey = safeString_(values[3]);
    const sectionType = safeString_(values[4]);
    const questionFrom = values[5];
    const questionTo = values[6];
    const status = safeString_(values[7]);

    if (status !== 'pending' && status !== 'retry_later') continue;

    try {
      sheet.getRange(row, 8).setValue('processing');
      sheet.getRange(row, 11).setValue(now_());

      const result = callGeminiParsePdfPage_({
        examSetId,
        pdfFileId,
        pageNo,
        partKey,
        sectionType,
        questionFrom,
        questionTo
      });

      sheet.getRange(row, 8).setValue('done');
      sheet.getRange(row, 9).setValue(JSON.stringify(result));
      sheet.getRange(row, 10).setValue('');
      sheet.getRange(row, 11).setValue(now_());

      processed++;
    } catch (err) {
      sheet.getRange(row, 8).setValue('error');
      sheet.getRange(row, 10).setValue(String(err.message || '').slice(0, 500));
      sheet.getRange(row, 11).setValue(now_());
    }
  }
}

function callGeminiParsePdfPage_(params) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(CONFIG.GEMINI_API_KEY_PROP);
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const file = DriveApp.getFileById(params.pdfFileId);
  const blob = file.getBlob();
  const base64Pdf = Utilities.base64Encode(blob.getBytes());

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(CONFIG.GEMINI_MODEL) +
    ':generateContent?key=' +
    encodeURIComponent(apiKey);

  const prompt = buildPdfPageParsePrompt_(params);

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: base64Pdf
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: buildPdfPageParseSchema_(),
      temperature: 0.1,
      maxOutputTokens: 8192
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error(`Gemini PDF parse error ${status}: ${body}`);
  }

  const parsed = JSON.parse(body);
  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned empty PDF parse result');
  }

  const result = JSON.parse(text);
  return normalizeParsedPdfPage_(result, params);
}