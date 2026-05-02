function writeAiResult_(sheet, row, data, meta) {
  const kind = getSheetKind_(sheet);
  if (kind === 'grammar') return writeGrammarAiResult_(sheet, row, data, meta);

  const timestamp = now_();
  const normalized = normalizeAiVocabData_(data);
  const metaValues = buildExecutionMetaValues_(meta);

  const rowValues = [
    normalized.normalized_text,
    normalized.pinyin,
    normalized.meanings_vi,
    normalized.han_viet,
    normalized.traditional_variant,
    normalized.main_radicals,
    normalized.component_breakdown_json,
    normalized.radical_summary,
    normalized.hsk_level,
    normalized.part_of_speech,
    normalized.topic_tags,
    normalized.examples,
    normalized.similar_chars,
    normalized.character_structure_type,
    normalized.structure_explanation,
    normalized.mnemonic,
    normalized.notes,
    normalized.source_confidence,
    normalized.ambiguity_flag,
    normalized.ambiguity_note,
    normalized.reading_candidates,
    normalized.review_status,
    AI_STATUS.DONE,
    timestamp
  ].concat(metaValues);

  // Add senses_json if column exists
  if (CONFIG.COL_SENSES_JSON <= CONFIG.HEADER_WIDTH) {
    rowValues.push(normalized.senses_json);
  }

  sheet.getRange(row, CONFIG.COL_NORMALIZED_TEXT, 1, rowValues.length).setValues([rowValues]);
}

function normalizeAiVocabData_(data) {
  const sensesObj = normalizeSenses_(data && data.senses);
  const sensesJson = stringifySensesForSheet_(sensesObj);
  const legacy = deriveLegacyFieldsFromSenses_(sensesObj) || {};

  const sourceConfidence = normalizeSourceConfidence_(data && data.source_confidence);
  const ambiguityFlag = normalizeBooleanString_(data && (data.ambiguity_flag || (sensesObj.length > 1)));
  const aiReviewStatus = normalizeReviewStatus_(data && data.review_status);
  
  const reviewStatus = (ambiguityFlag === 'true' || sourceConfidence === SOURCE_CONFIDENCE.LOW)
    ? REVIEW_STATUS.NEEDS_REVIEW
    : aiReviewStatus;

  return {
    normalized_text: safeString_(data && data.normalized_text),
    pinyin: legacy.pinyin || safeString_(data && data.pinyin),
    meanings_vi: legacy.meanings_vi || joinArray_(data && (data.meanings_vi || data.meaning_vi)),
    han_viet: safeString_(data && data.han_viet),
    traditional_variant: safeString_(data && data.traditional_variant),
    main_radicals: joinArray_(normalizeRadicalList_(data && data.main_radicals)),
    component_breakdown_json: safeJsonString_(data && (data.component_breakdown || data.components)),
    radical_summary: safeString_(data && data.radical_summary),
    hsk_level: normalizeHskLevel_(data && data.hsk_level),
    part_of_speech: legacy.part_of_speech || joinArray_(normalizePartOfSpeech_(data && (data.part_of_speech || data.pos))),
    topic_tags: joinArray_(normalizeTopicTags_(data && data.topic_tags)),
    examples: legacy.examples || formatExamples_(data && data.examples),
    similar_chars: joinArray_(data && (data.similar_chars || data.similar)),
    character_structure_type: normalizeStructureType_(data && (data.character_structure_type || data.structure_type)),
    structure_explanation: safeString_(data && (data.structure_explanation || data.structure_note)),
    mnemonic: safeString_(data && data.mnemonic),
    notes: safeString_(data && data.notes),
    source_confidence: sourceConfidence,
    ambiguity_flag: ambiguityFlag,
    ambiguity_note: safeString_(data && data.ambiguity_note),
    reading_candidates: legacy.reading_candidates || joinArray_(data && data.reading_candidates),
    review_status: reviewStatus,
    senses_json: sensesJson
  };
}

function writeAiError_(sheet, row, message, meta) {
  const timestamp = now_();
  const metaValues = buildExecutionMetaValues_(meta);
  const statusCol = getSheetKind_(sheet) === 'grammar' ? GRAMMAR_COL.AI_STATUS : CONFIG.COL_AI_STATUS;
  
  sheet.getRange(row, statusCol, 1, 5).setValues([[`error: ${safeString_(message).slice(0, 200)}`, timestamp].concat(metaValues)]);
}

function writeAiRetryLater_(sheet, row, meta) {
  const timestamp = now_();
  const metaValues = buildExecutionMetaValues_(meta);
  const statusCol = getSheetKind_(sheet) === 'grammar' ? GRAMMAR_COL.AI_STATUS : CONFIG.COL_AI_STATUS;

  sheet.getRange(row, statusCol, 1, 5).setValues([[AI_STATUS.RETRY_LATER, timestamp].concat(metaValues)]);
}

function buildExecutionMetaValues_(meta) {
  return [
    meta && meta.apiKey ? maskApiKey_(meta.apiKey) : '',
    safeString_(meta && meta.model),
    safeNumberOrBlank_(meta && meta.durationMs)
  ];
}

function markRowPending_(sheet, row, meta) {
  const timestamp = now_();
  const metaValues = buildExecutionMetaValues_(meta);
  const startCol = getSheetKind_(sheet) === 'grammar' ? GRAMMAR_COL.REVIEW_STATUS : CONFIG.COL_REVIEW_STATUS;

  sheet.getRange(row, startCol, 1, 6).setValues([[REVIEW_STATUS.PENDING, AI_STATUS.PENDING, timestamp].concat(metaValues)]);
}

function touchRowUpdatedAt_(sheet, row) {
  const kind = getSheetKind_(sheet);
  const col = kind === 'grammar' ? GRAMMAR_COL.UPDATED_AT : CONFIG.COL_UPDATED_AT;
  sheet.getRange(row, col).setValue(now_());
}
