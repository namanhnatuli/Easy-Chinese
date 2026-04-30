function updateTimestamp_(sheet, row) {
  sheet.getRange(row, CONFIG.COL_UPDATED_AT).setValue(now_());
}

function markRowPending_(sheet, row, meta) {
  sheet.getRange(row, CONFIG.COL_AI_STATUS).setValue('pending');
  writeExecutionMeta_(sheet, row, meta);
  updateTimestamp_(sheet, row);
}

function writeAiResult_(sheet, row, data, meta) {
  const topicTags = normalizeTopicTags_(data.topic_tags);
  const partOfSpeech = normalizePartOfSpeech_(data.part_of_speech);
  const structureType = normalizeStructureType_(data.character_structure_type);
  const sourceConfidence = normalizeSourceConfidence_(data.source_confidence);
  const reviewStatus = normalizeReviewStatus_(data.review_status);
  const mainRadicals = normalizeRadicalList_(data.main_radicals);
  const componentBreakdown = normalizeComponentBreakdown_(data.component_breakdown);

  sheet.getRange(row, CONFIG.COL_NORMALIZED_TEXT, 1, 23).setValues([[
    safeString_(data.normalized_text),
    safeString_(data.pinyin),
    joinArray_(data.meanings_vi),
    safeString_(data.han_viet),
    safeString_(data.traditional_variant),

    joinArray_(mainRadicals),
    safeJsonString_(componentBreakdown),
    safeString_(data.radical_summary),

    normalizeHskLevel_(data.hsk_level),
    joinArray_(partOfSpeech),
    joinArray_(topicTags),
    joinExamples_(data.examples),
    joinArray_(data.similar_chars),

    structureType,
    safeString_(data.structure_explanation),
    safeString_(data.mnemonic),
    safeString_(data.notes),

    sourceConfidence,
    normalizeBooleanString_(data.ambiguity_flag),
    safeString_(data.ambiguity_note),
    joinArray_(data.reading_candidates, ' || '),
    reviewStatus,
    'done'
  ]]);

  writeExecutionMeta_(sheet, row, meta);
  updateTimestamp_(sheet, row);
}

function writeAiRetryLater_(sheet, row, meta) {
  sheet.getRange(row, CONFIG.COL_AI_STATUS).setValue('retry_later');
  writeExecutionMeta_(sheet, row, meta);
  updateTimestamp_(sheet, row);
}

function writeAiError_(sheet, row, message, meta) {
  sheet.getRange(row, CONFIG.COL_AI_STATUS)
    .setValue(`error: ${String(message || '').slice(0, 200)}`);

  writeExecutionMeta_(sheet, row, meta);
  updateTimestamp_(sheet, row);
}

function setReviewStatusForRow_(row, status) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);
  sheet.getRange(row, CONFIG.COL_REVIEW_STATUS).setValue(status);
  updateTimestamp_(sheet, row);
}