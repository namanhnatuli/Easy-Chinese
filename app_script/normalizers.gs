function normalizeHskLevel_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/\d+/);
  if (!match) return '';
  const num = match[0];
  const allowed = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  return allowed.has(num) ? num : '';
}

function normalizePartOfSpeech_(parts) {
  const allowed = new Set(ALLOWED_PART_OF_SPEECH);
  const mapping = {
    'danh từ': 'danh_tu', 'noun': 'danh_tu', 'n': 'danh_tu',
    'động từ': 'dong_tu', 'verb': 'dong_tu', 'v': 'dong_tu',
    'tính từ': 'tinh_tu', 'adjective': 'tinh_tu', 'adj': 'tinh_tu',
    'phó từ': 'pho_tu', 'adverb': 'pho_tu', 'adv': 'pho_tu',
    'lượng từ': 'luong_tu', 'measure word': 'luong_tu', 'm': 'luong_tu',
    'đại từ': 'dai_tu', 'pronoun': 'dai_tu', 'pron': 'dai_tu',
    'giới từ': 'gioi_tu', 'preposition': 'gioi_tu', 'prep': 'gioi_tu',
    'trợ từ': 'tro_tu', 'particle': 'tro_tu', 'part': 'tro_tu',
    'số từ': 'so_tu', 'numeral': 'so_tu', 'num': 'so_tu',
    'trợ động từ': 'tro_dong_tu', 'modal verb': 'tro_dong_tu',
    'da loai tu': 'da_loai_tu', 'multi-pos': 'da_loai_tu'
  };

  const input = Array.isArray(parts) ? parts : String(parts || '').split(/[|,\s]+/).filter(Boolean);
  const normalized = input
    .map(p => String(p || '').trim().toLowerCase())
    .map(p => mapping[p] || p)
    .filter(p => allowed.has(p));
  
  return [...new Set(normalized)];
}

function normalizeTopicTags_(tags) {
  const allowed = new Set(ALLOWED_TOPIC_TAGS);
  const input = Array.isArray(tags) ? tags : String(tags || '').split(/[|,\s]+/).filter(Boolean);
  const normalized = input
    .map(t => String(t || '').trim().toLowerCase())
    .filter(t => allowed.has(t));
  return [...new Set(normalized)].slice(0, 5);
}

function normalizeReviewStatus_(value) {
  const v = String(value || '').trim().toLowerCase();
  const allowed = [REVIEW_STATUS.PENDING, REVIEW_STATUS.NEEDS_REVIEW, REVIEW_STATUS.APPROVED];
  return allowed.includes(v) ? v : REVIEW_STATUS.PENDING;
}

function normalizeSourceConfidence_(value) {
  const v = String(value || '').trim().toLowerCase();
  const allowed = [SOURCE_CONFIDENCE.HIGH, SOURCE_CONFIDENCE.MEDIUM, SOURCE_CONFIDENCE.LOW];
  return allowed.includes(v) ? v : SOURCE_CONFIDENCE.MEDIUM;
}

function normalizeStructureType_(value) {
  const v = String(value || '').trim().toLowerCase();
  return ALLOWED_CHARACTER_STRUCTURES.includes(v) ? v : 'khong_ro';
}

function normalizeBooleanString_(value) {
  return value === true || String(value).toLowerCase() === 'true' ? 'true' : 'false';
}

function parseExamples_(examplesText) {
  const raw = safeString_(examplesText);
  if (!raw) return [];

  return raw
    .split('||')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const parts = item.split('|').map(x => x.trim());
      const obj = { cn: '', py: '', vi: '' };
      parts.forEach(part => {
        if (part.startsWith('CN=')) obj.cn = part.slice(3).trim();
        else if (part.startsWith('PY=')) obj.py = part.slice(3).trim();
        else if (part.startsWith('VI=')) obj.vi = part.slice(3).trim();
      });
      return obj;
    });
}

function formatExamples_(examples) {
  if (!Array.isArray(examples)) return '';
  return examples
    .map(ex => {
      const cn = safeString_(ex.cn || ex.chinese_text);
      const py = safeString_(ex.py || ex.pinyin);
      const vi = safeString_(ex.vi || ex.vietnamese_meaning || ex.meaning_vi);
      if (!cn && !py && !vi) return '';
      return `CN=${cn}|PY=${py}|VI=${vi}`;
    })
    .filter(Boolean)
    .join(' || ');
}

function normalizeUsageNote_(note, meaningVi, pinyin, hanViet, partOfSpeech) {
  let text = safeString_(note);
  if (!text) return '';

  const lower = text.toLowerCase();

  const forbiddenSignals = [
    'nghĩa là',
    'có nghĩa',
    'pinyin',
    'phiên âm',
    'hán việt',
    'là một',
    'dùng để chỉ',
    'ví dụ',
    'example',
    'part_of_speech',
    'từ loại'
  ];

  if (forbiddenSignals.some(x => lower.includes(x))) {
    return '';
  }

  const meaning = safeString_(meaningVi).toLowerCase();
  if (meaning && lower.includes(meaning)) {
    return '';
  }

  const py = safeString_(pinyin).toLowerCase();
  if (py && lower.includes(py)) {
    return '';
  }

  const hv = safeString_(hanViet).toLowerCase();
  if (hv && lower.includes(hv)) {
    return '';
  }

  const pos = safeString_(partOfSpeech).toLowerCase();
  if (pos && lower.includes(pos)) {
    return '';
  }

  const words = text.split(/\s+/).filter(Boolean);

  if (words.length > 10) {
    text = words.slice(0, 10).join(' ');
  }

  return text;
}

function normalizeSenseExample_(example) {
  return {
    cn: safeString_(example && example.cn),
    py: safeString_(example && example.py),
    vi: safeString_(example && example.vi)
  };
}

function normalizeSenseExamples_(examples) {
  if (!Array.isArray(examples)) return [];

  return examples
    .map(normalizeSenseExample_)
    .filter(ex => ex.cn || ex.py || ex.vi)
    .slice(0, 2);
}

function normalizeSenses_(senses, rootData) {
  if (!Array.isArray(senses)) return [];

  return senses.slice(0, 3).map((sense, index) => {
    const pinyin = safeString_(sense && sense.pinyin) || safeString_(rootData && rootData.pinyin);
    const partOfSpeech = safeString_(sense && sense.part_of_speech);
    const meaningVi = safeString_(sense && sense.meaning_vi);
    const hanViet = safeString_(rootData && rootData.han_viet);

    return {
      pinyin: pinyin,
      part_of_speech: partOfSpeech,
      meaning_vi: meaningVi,
      usage_note: normalizeUsageNote_(
        sense && sense.usage_note,
        meaningVi,
        pinyin,
        hanViet,
        partOfSpeech
      ),
      examples: normalizeSenseExamples_(sense && sense.examples),
      sense_order: Number((sense && sense.sense_order) || index + 1),
      is_primary: (sense && sense.is_primary) === true
    };
  });
}

function stringifySensesForSheet_(normalizedSenses) {
  if (!Array.isArray(normalizedSenses)) return '[]';
  const clean = normalizedSenses.map(s => {
    const { is_primary, ...rest } = s;
    return rest;
  });
  return JSON.stringify(clean);
}

function deriveLegacyFieldsFromSenses_(senses) {
  if (!Array.isArray(senses) || !senses.length) return null;

  const primary = senses.find(s => s.is_primary) || senses[0];
  
  const allMeanings = senses.map(s => s.meaning_vi).filter(Boolean);
  const allPos = [...new Set(senses.map(s => s.part_of_speech).filter(Boolean))];
  const allPinyins = [...new Set(senses.map(s => s.pinyin).filter(Boolean))];

  return {
    pinyin: primary.pinyin || allPinyins[0] || '',
    meanings_vi: allMeanings.join(' | '),
    part_of_speech: allPos.join(' | '),
    examples: formatExamples_(senses.flatMap(s => s.examples).slice(0, 3)),
    reading_candidates: senses.map(s => `PINYIN=${s.pinyin}|MEANINGS=${s.meaning_vi}`).join(' || ')
  };
}
