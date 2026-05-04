const CONFIG = {
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_API_KEY_PROP: 'GEMINI_API_KEY',

  SHEET_EXAM_SETS: 'ExamSets',
  SHEET_EXAM_SECTIONS: 'ExamSections',
  SHEET_QUESTION_GROUPS: 'QuestionGroups',
  SHEET_QUESTIONS: 'Questions',
  SHEET_OPTIONS: 'QuestionOptions',
  SHEET_ASSETS: 'QuestionAssets',
  SHEET_PDF_PAGES: 'PdfParsePages',

  PDF_PARSE_BATCH_SIZE: 1,
  CROP_BACKEND_URL: 'https://your-backend-url.com'
};

const HSK1_PARTS = [
  { page_no: 1, part_key: 'meta', section_type: 'meta', question_from: '', question_to: '' },
  { page_no: 3, part_key: 'listening_part_1', section_type: 'listening', question_from: 1, question_to: 5 },
  { page_no: 4, part_key: 'listening_part_2_a', section_type: 'listening', question_from: 6, question_to: 8 },
  { page_no: 5, part_key: 'listening_part_2_b', section_type: 'listening', question_from: 9, question_to: 10 },
  { page_no: 6, part_key: 'listening_part_3', section_type: 'listening', question_from: 11, question_to: 15 },
  { page_no: 7, part_key: 'listening_part_4', section_type: 'listening', question_from: 16, question_to: 20 },
  { page_no: 8, part_key: 'reading_part_1', section_type: 'reading', question_from: 21, question_to: 25 },
  { page_no: 9, part_key: 'reading_part_2', section_type: 'reading', question_from: 26, question_to: 30 },
  { page_no: 10, part_key: 'reading_part_3', section_type: 'reading', question_from: 31, question_to: 35 },
  { page_no: 11, part_key: 'reading_part_4', section_type: 'reading', question_from: 36, question_to: 40 }
];