function normalizeParsedPdfPage_(parsed, params) {
  if (!parsed || typeof parsed !== 'object') {
    parsed = {};
  }

  parsed.page_no = Number(parsed.page_no || params.pageNo);
  parsed.part_key = safeString_(parsed.part_key || params.partKey);

  if (!parsed.section) parsed.section = {};
  parsed.section.section_type = safeString_(parsed.section.section_type || params.sectionType);
  parsed.section.title_vi = normalizeSectionTitleVi_(parsed.section.section_type, parsed.section.title_vi);

  if (!parsed.group) parsed.group = {};
  parsed.group.question_from = Number(parsed.group.question_from || params.questionFrom || '');
  parsed.group.question_to = Number(parsed.group.question_to || params.questionTo || '');
  parsed.group.question_type = safeString_(parsed.group.question_type || inferQuestionTypeFromPartKey_(params.partKey));
  parsed.group.instruction = normalizeGroupInstruction_(parsed.group.question_type, parsed.group.instruction);

  if (!Array.isArray(parsed.questions)) {
    parsed.questions = [];
  }

  parsed.questions = parsed.questions.map(q => normalizeParsedQuestion_(q, parsed.group));

  // Nếu Gemini bỏ sót câu hỏi trong range, tự tạo placeholder
  parsed.questions = ensureQuestionsInRange_(parsed.questions, parsed.group, params);

  if (!Array.isArray(parsed.group_options)) {
    parsed.group_options = [];
  }

  parsed.group_options = normalizeGroupOptions_(parsed.group_options, parsed.group.question_type);

  if (!Array.isArray(parsed.assets)) {
    parsed.assets = [];
  }

  parsed.assets = normalizeAssets_(parsed.assets, parsed.questions);

  return parsed;
}

function normalizeParsedQuestion_(q, group) {
  q = q || {};

  const questionNo = Number(q.question_no || 0);
  const questionType = safeString_(q.question_type || group.question_type);

  const normalized = {
    question_no: questionNo,
    question_type: questionType,
    question_text_zh: safeString_(q.question_text_zh),
    question_text_pinyin: safeString_(q.question_text_pinyin),
    question_text_vi: safeString_(q.question_text_vi),
    stem_text: safeString_(q.stem_text),
    answer_key: safeString_(q.answer_key),
    options: Array.isArray(q.options) ? q.options : []
  };

  if (isTrueFalseQuestionType_(questionType)) {
    normalized.options = buildTrueFalseOptions_();
  } else {
    normalized.options = normalized.options.map(normalizeOption_);
  }

  return normalized;
}

function ensureQuestionsInRange_(questions, group, params) {
  const from = Number(group.question_from || params.questionFrom || 0);
  const to = Number(group.question_to || params.questionTo || 0);
  const questionType = safeString_(group.question_type);

  if (!from || !to) return questions;

  const byNo = {};
  questions.forEach(q => {
    if (q.question_no) byNo[q.question_no] = q;
  });

  const result = [];

  for (let no = from; no <= to; no++) {
    if (byNo[no]) {
      result.push(byNo[no]);
      continue;
    }

    result.push(normalizeParsedQuestion_({
      question_no: no,
      question_type: questionType,
      options: []
    }, group));
  }

  return result;
}

function isTrueFalseQuestionType_(questionType) {
  return (
    questionType === 'listen_true_false_image' ||
    questionType === 'read_true_false_image_word'
  );
}

function buildTrueFalseOptions_() {
  return [
    {
      option_key: 'T',
      option_order: 1,
      option_type: 'boolean',
      text_zh: '对',
      pinyin: 'duì',
      text_vi: 'Đúng',
      asset_hint: ''
    },
    {
      option_key: 'F',
      option_order: 2,
      option_type: 'boolean',
      text_zh: '错',
      pinyin: 'cuò',
      text_vi: 'Sai',
      asset_hint: ''
    }
  ];
}

function normalizeOption_(opt) {
  opt = opt || {};

  return {
    option_key: safeString_(opt.option_key),
    option_order: Number(opt.option_order || ''),
    option_type: safeString_(opt.option_type),
    text_zh: safeString_(opt.text_zh),
    pinyin: safeString_(opt.pinyin),
    text_vi: safeString_(opt.text_vi),
    asset_hint: safeString_(opt.asset_hint)
  };
}

function normalizeGroupOptions_(options, questionType) {
  if (!Array.isArray(options)) return [];

  return options.map(normalizeOption_).filter(opt => opt.option_key);
}

function normalizeAssets_(assets, questions) {
  const normalized = assets.map(asset => {
    asset = asset || {};

    return {
      asset_key: safeString_(asset.asset_key),
      owner_type: safeString_(asset.owner_type),
      owner_ref: normalizeOwnerRef_(asset.owner_ref),
      asset_type: safeString_(asset.asset_type),
      asset_hint: safeString_(asset.asset_hint)
    };
  }).filter(asset => asset.asset_key || asset.asset_hint);

  return normalized;
}

function normalizeOwnerRef_(ownerRef) {
  const raw = safeString_(ownerRef);

  // q1 -> 1
  const match = raw.match(/^q(\d+)$/i);
  if (match) return match[1];

  return raw;
}

function normalizeSectionTitleVi_(sectionType, current) {
  if (safeString_(current)) return safeString_(current);

  if (sectionType === 'listening') return 'Nghe hiểu';
  if (sectionType === 'reading') return 'Đọc hiểu';

  return '';
}

function normalizeGroupInstruction_(questionType, current) {
  const c = safeString_(current);

  if (questionType === 'listen_true_false_image') {
    return 'Nghe và chọn Đúng / Sai';
  }

  if (questionType === 'read_true_false_image_word') {
    return 'Xem hình và chọn Đúng / Sai';
  }

  if (questionType === 'listen_choose_picture') {
    return 'Nghe và chọn hình đúng';
  }

  if (questionType === 'listen_match_picture') {
    return 'Nghe hội thoại và chọn hình phù hợp';
  }

  if (questionType === 'listen_choose_text') {
    return 'Nghe và chọn đáp án đúng';
  }

  if (questionType === 'read_match_picture') {
    return 'Đọc câu và chọn hình phù hợp';
  }

  if (questionType === 'read_match_response') {
    return 'Nối câu hỏi với câu trả lời phù hợp';
  }

  if (questionType === 'read_fill_blank_word') {
    return 'Chọn từ điền vào chỗ trống';
  }

  return c;
}

function inferQuestionTypeFromPartKey_(partKey) {
  const key = safeString_(partKey);

  if (key === 'listening_part_1') return 'listen_true_false_image';
  if (key.indexOf('listening_part_2') === 0) return 'listen_choose_picture';
  if (key === 'listening_part_3') return 'listen_match_picture';
  if (key === 'listening_part_4') return 'listen_choose_text';

  if (key === 'reading_part_1') return 'read_true_false_image_word';
  if (key === 'reading_part_2') return 'read_match_picture';
  if (key === 'reading_part_3') return 'read_match_response';
  if (key === 'reading_part_4') return 'read_fill_blank_word';

  return '';
}