const CONFIG = {
  HANZI_SHEET: 'Hanzi',
  GRAMMAR_SHEET: 'NguPhap',
  CACHE_SHEET: 'AI_CACHE',
  HEADER_ROW: 1,
  HEADER_WIDTH: 29, // Updated for senses_json
  GRAMMAR_HEADER_WIDTH: 20,

  COL_INPUT_TEXT: 1,
  COL_NORMALIZED_TEXT: 2,
  COL_PINYIN: 3,
  COL_MEANINGS_VI: 4,
  COL_HAN_VIET: 5,
  COL_TRADITIONAL_VARIANT: 6,

  COL_MAIN_RADICALS: 7,
  COL_COMPONENT_BREAKDOWN_JSON: 8,
  COL_RADICAL_SUMMARY: 9,

  COL_HSK_LEVEL: 10,
  COL_PART_OF_SPEECH: 11,
  COL_TOPIC_TAGS: 12,
  COL_EXAMPLES: 13,
  COL_SIMILAR_CHARS: 14,

  COL_CHARACTER_STRUCTURE_TYPE: 15,
  COL_STRUCTURE_EXPLANATION: 16,
  COL_MNEMONIC: 17,
  COL_NOTES: 18,
  COL_SOURCE_CONFIDENCE: 19,
  COL_AMBIGUITY_FLAG: 20,
  COL_AMBIGUITY_NOTE: 21,
  COL_READING_CANDIDATES: 22,
  COL_REVIEW_STATUS: 23,
  COL_AI_STATUS: 24,
  COL_UPDATED_AT: 25,

  COL_LAST_API_KEY: 26,      // Z
  COL_LAST_MODEL: 27,        // AA
  COL_LAST_DURATION_MS: 28,  // AB
  COL_SENSES_JSON: 29,       // AC

  GEMINI_MODEL_WEIGHTS: [
    { model: 'gemini-3.1-flash-lite-preview', weight: 5 },
    { model: 'gemini-2.5-flash', weight: 2 },
    { model: 'gemini-2.5-flash-lite', weight: 1 },
    { model: 'gemini-3-flash-preview', weight: 1 }
  ],

  MAX_RETRY_ATTEMPTS_PER_MODEL: 1,
  BASE_RETRY_DELAY_MS: 1500,
  MAX_RETRY_DELAY_MS: 12000,

  AI_MICRO_BATCH_SIZE: 1,
  WORKER_COUNT: 5,
  WORKER_TRIGGER_INTERVAL_MIN: 5,
  RECOVERY_TRIGGER_INTERVAL_MIN: 15,

  STALE_PROCESSING_MINUTES: 15,
  INLINE_PASTE_THRESHOLD_ROWS: 1,
  ENABLE_INLINE_SINGLE_CELL_PROCESSING: true,
  MANUAL_PROCESS_BATCH_LIMIT: 3,
  CLAIM_LOCK_TIMEOUT_MS: 3000,
  ROUTE_LOCK_TIMEOUT_MS: 3000,
  GEMINI_ROUTE_STATE_PROPERTY: 'GEMINI_ROUTE_STATE'
};

const HANZI_HEADERS = [
  'input_text',
  'normalized_text',
  'pinyin',
  'meanings_vi',
  'han_viet',
  'traditional_variant',
  'main_radicals',
  'component_breakdown_json',
  'radical_summary',
  'hsk_level',
  'part_of_speech',
  'topic_tags',
  'examples',
  'similar_chars',
  'character_structure_type',
  'structure_explanation',
  'mnemonic',
  'notes',
  'source_confidence',
  'ambiguity_flag',
  'ambiguity_note',
  'reading_candidates',
  'review_status',
  'ai_status',
  'updated_at',
  'last_used_api_key',
  'last_used_model',
  'last_duration_ms',
  'senses_json'
];

const GRAMMAR_HEADERS = [
  'Điểm ngữ pháp',
  'Giải thích',
  'Ví dụ',
  'HSK',
  'title',
  'slug',
  'structure_text',
  'explanation_vi',
  'notes',
  'examples_structured',
  'hsk_level',
  'source_confidence',
  'ambiguity_flag',
  'ambiguity_note',
  'review_status',
  'ai_status',
  'updated_at',
  'last_used_api_key',
  'last_used_model',
  'last_duration_ms'
];

const GRAMMAR_COL = {
  RAW_TITLE: 1,
  RAW_EXPLANATION: 2,
  RAW_EXAMPLES: 3,
  RAW_HSK: 4,
  TITLE: 5,
  SLUG: 6,
  STRUCTURE_TEXT: 7,
  EXPLANATION_VI: 8,
  NOTES: 9,
  EXAMPLES_STRUCTURED: 10,
  HSK_LEVEL: 11,
  SOURCE_CONFIDENCE: 12,
  AMBIGUITY_FLAG: 13,
  AMBIGUITY_NOTE: 14,
  REVIEW_STATUS: 15,
  AI_STATUS: 16,
  UPDATED_AT: 17,
  LAST_API_KEY: 18,
  LAST_MODEL: 19,
  LAST_DURATION_MS: 20
};
