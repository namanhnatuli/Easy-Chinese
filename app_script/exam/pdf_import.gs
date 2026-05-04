function createHskPdfImportJob() {
  const examSetId = Browser.inputBox('exam_set_id', 'Ví dụ: hsk1_sample_001', Browser.Buttons.OK_CANCEL);
  if (examSetId === 'cancel') return;

  const pdfFileId = Browser.inputBox('Google Drive PDF file ID', 'Dán file ID của PDF trên Google Drive', Browser.Buttons.OK_CANCEL);
  if (pdfFileId === 'cancel') return;

  const audioAssetId = Browser.inputBox('audio_asset_id', 'Ví dụ: asset_audio_hsk1_sample_001', Browser.Buttons.OK_CANCEL);
  if (audioAssetId === 'cancel') return;

  upsertRowByFirstColumn_(CONFIG.SHEET_EXAM_SETS, examSetId, [
    examSetId,
    '1',
    'HSK 1 样卷',
    'official_sample',
    pdfFileId,
    audioAssetId,
    40,
    40,
    'importing',
    now_(),
    now_()
  ]);

  seedHsk1Sections_(examSetId);
  seedPdfParsePages_(examSetId, pdfFileId);

  SpreadsheetApp.getUi().alert('Created import job for ' + examSetId);
}

function seedHsk1Sections_(examSetId) {
  upsertRowByFirstColumn_(CONFIG.SHEET_EXAM_SECTIONS, `${examSetId}_listening`, [
    `${examSetId}_listening`,
    examSetId,
    1,
    'listening',
    '听力',
    'Nghe hiểu',
    1,
    20,
    15,
    'Nghe audio và trả lời câu hỏi'
  ]);

  upsertRowByFirstColumn_(CONFIG.SHEET_EXAM_SECTIONS, `${examSetId}_reading`, [
    `${examSetId}_reading`,
    examSetId,
    2,
    'reading',
    '阅读',
    'Đọc hiểu',
    21,
    40,
    17,
    'Đọc và chọn đáp án đúng'
  ]);
}

function seedPdfParsePages_(examSetId, pdfFileId) {
  const sheet = getSheet_(CONFIG.SHEET_PDF_PAGES);

  HSK1_PARTS.forEach(part => {
    const id = `${examSetId}_${part.part_key}`;

    upsertRowByFirstColumn_(CONFIG.SHEET_PDF_PAGES, id, [
      examSetId,
      pdfFileId,
      part.page_no,
      part.part_key,
      part.section_type,
      part.question_from,
      part.question_to,
      'pending',
      '',
      '',
      now_()
    ]);
  });
}