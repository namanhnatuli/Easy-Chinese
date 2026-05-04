function setupExamSheets() {
  createSheetWithHeader_(CONFIG.SHEET_EXAM_SETS, [
    'exam_set_id', 'hsk_level', 'title', 'exam_type', 'source_pdf_file_id',
    'audio_asset_id', 'total_questions', 'total_minutes', 'status',
    'created_at', 'updated_at'
  ]);

  createSheetWithHeader_(CONFIG.SHEET_EXAM_SECTIONS, [
    'section_id', 'exam_set_id', 'section_order', 'section_type',
    'title_zh', 'title_vi', 'question_from', 'question_to',
    'time_limit_minutes', 'instruction'
  ]);

  createSheetWithHeader_(CONFIG.SHEET_QUESTION_GROUPS, [
    'group_id', 'section_id', 'exam_set_id', 'group_order', 'part_key',
    'question_from', 'question_to', 'question_type',
    'shared_audio_asset_id', 'shared_image_asset_id', 'instruction'
  ]);

  createSheetWithHeader_(CONFIG.SHEET_QUESTIONS, [
    'question_id', 'group_id', 'section_id', 'exam_set_id',
    'question_no', 'question_order', 'question_type',
    'question_text_zh', 'question_text_pinyin', 'question_text_vi',
    'stem_text', 'answer_key', 'explanation', 'status'
  ]);

  createSheetWithHeader_(CONFIG.SHEET_OPTIONS, [
    'option_id', 'question_id', 'group_id', 'option_key', 'option_order',
    'option_type', 'text_zh', 'pinyin', 'text_vi',
    'asset_id', 'is_correct'
  ]);

  createSheetWithHeader_(CONFIG.SHEET_ASSETS, [
    'asset_id', 'owner_type', 'owner_id', 'asset_type',
    'storage_provider', 'storage_path', 'public_url',
    'transcript_zh', 'transcript_pinyin', 'sort_order',
    'review_status', 'bbox'
  ]);

  createSheetWithHeader_(CONFIG.SHEET_PDF_PAGES, [
    'exam_set_id', 'pdf_file_id', 'page_no', 'part_key',
    'section_type', 'question_from', 'question_to',
    'parse_status', 'raw_json', 'error', 'updated_at'
  ]);
}

function createSheetWithHeader_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}