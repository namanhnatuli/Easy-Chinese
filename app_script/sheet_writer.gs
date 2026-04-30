function markRowPending_(sheet, row, meta) {
  const timestamp = now_();
  const metaValues = buildExecutionMetaValues_(meta);

  sheet
    .getRange(row, CONFIG.COL_REVIEW_STATUS, 1, 6)
    .setValues([['pending', 'pending', timestamp].concat(metaValues)]);
}

function writeAiResult_(sheet, row, data, meta) {
  const timestamp = now_();
  const normalized = normalizeAiData_(data);
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
    'done',
    timestamp
  ].concat(metaValues);

  sheet
    .getRange(row, CONFIG.COL_NORMALIZED_TEXT, 1, rowValues.length)
    .setValues([rowValues]);
}

function writeAiRetryLater_(sheet, row, meta) {
  const timestamp = now_();
  const metaValues = buildExecutionMetaValues_(meta);

  sheet
    .getRange(row, CONFIG.COL_AI_STATUS, 1, 5)
    .setValues([['retry_later', timestamp].concat(metaValues)]);
}

function writeAiError_(sheet, row, message, meta) {
  const timestamp = now_();
  const metaValues = buildExecutionMetaValues_(meta);

  sheet
    .getRange(row, CONFIG.COL_AI_STATUS, 1, 5)
    .setValues([[buildErrorStatus_(message), timestamp].concat(metaValues)]);
}

function setReviewStatusForRow_(row, status) {
  const sheet = getHanziSheet_();
  const normalizedStatus = normalizeReviewStatus_(status);
  sheet
    .getRange(row, CONFIG.COL_REVIEW_STATUS, 1, 3)
    .setValues([[normalizedStatus, safeString_(sheet.getRange(row, CONFIG.COL_AI_STATUS).getValue()), now_()]]);
}

function normalizeAiData_(data) {
  const normalizedText = safeString_(data && data.normalized_text);
  const meanings = normalizeStringArray_(data && data.meanings_vi, ' | ');
  const mainRadicals = normalizeRadicalList_(data && data.main_radicals);
  const componentBreakdown = normalizeComponentBreakdown_(data && data.component_breakdown);
  const topicTags = normalizeTopicTags_(data && data.topic_tags);
  const partOfSpeech = normalizePartOfSpeech_(data && data.part_of_speech);
  const similarChars = normalizeStringArray_(data && data.similar_chars, ' | ');
  const readingCandidates = normalizeReadingCandidates_(data && data.reading_candidates);
  const sourceConfidence = normalizeSourceConfidence_(data && data.source_confidence);
  const ambiguityFlag = normalizeBooleanString_(data && data.ambiguity_flag);
  const reviewStatus = normalizeReviewStatus_(data && data.review_status);
  const finalReviewStatus =
    ambiguityFlag === 'true' || sourceConfidence === 'low'
      ? 'needs_review'
      : reviewStatus;

  return {
    normalized_text: normalizedText,
    pinyin: safeString_(data && data.pinyin),
    meanings_vi: meanings,
    han_viet: safeString_(data && data.han_viet),
    traditional_variant: safeString_(data && data.traditional_variant),
    main_radicals: joinArray_(mainRadicals),
    component_breakdown_json: safeJsonString_(componentBreakdown),
    radical_summary: safeString_(data && data.radical_summary),
    hsk_level: normalizeHskLevel_(data && data.hsk_level),
    part_of_speech: joinArray_(partOfSpeech),
    topic_tags: joinArray_(topicTags),
    examples: normalizeExamplesOutput_(data && data.examples),
    similar_chars: similarChars,
    character_structure_type: normalizeStructureType_(data && data.character_structure_type),
    structure_explanation: safeString_(data && data.structure_explanation),
    mnemonic: safeString_(data && data.mnemonic),
    notes: safeString_(data && data.notes),
    source_confidence: sourceConfidence,
    ambiguity_flag: ambiguityFlag,
    ambiguity_note: safeString_(data && data.ambiguity_note),
    reading_candidates: readingCandidates,
    review_status: finalReviewStatus
  };
}

function buildExecutionMetaValues_(meta) {
  return [
    meta && meta.apiKey ? maskApiKey_(meta.apiKey) : '',
    safeString_(meta && meta.model),
    safeNumberOrBlank_(meta && meta.durationMs)
  ];
}

function buildErrorStatus_(message) {
  return `error: ${safeString_(message).slice(0, 200)}`;
}
