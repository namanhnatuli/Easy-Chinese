function now_() {
  return new Date();
}

function safeString_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function safeNumberOrBlank_(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  return Number.isFinite(num) ? num : '';
}

function normalizeInputKey_(text) {
  return String(text || '').trim().toLowerCase();
}

function getHanziSheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.HANZI_SHEET);
  if (!sheet) {
    throw new Error(`Missing sheet: ${CONFIG.HANZI_SHEET}`);
  }
  return sheet;
}

function getGrammarSheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.GRAMMAR_SHEET);
  if (!sheet) {
    throw new Error(`Missing sheet: ${CONFIG.GRAMMAR_SHEET}`);
  }
  return sheet;
}

function getSheetKind_(sheet) {
  const sheetName = typeof sheet === 'string' ? sheet : sheet.getName();
  if (sheetName === CONFIG.HANZI_SHEET) return 'hanzi';
  if (sheetName === CONFIG.GRAMMAR_SHEET) return 'grammar';
  return '';
}

function getActiveSupportedSheet_() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const kind = getSheetKind_(sheet);
  if (!kind) {
    throw new Error(`Unsupported sheet: ${sheet.getName()}`);
  }

  return { sheet, kind };
}

function slugify_(value) {
  return safeString_(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function joinArray_(value, separator) {
  if (!Array.isArray(value)) return '';
  return value
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .join(separator || ' | ');
}

function joinExamples_(value) {
  return joinArray_(value, ' || ');
}

function normalizeStringArray_(value, separator) {
  if (!Array.isArray(value)) return '';

  return value
    .map(item => safeString_(item))
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .join(separator || ' | ');
}

function safeJsonString_(value) {
  try {
    return JSON.stringify(value || []);
  } catch (err) {
    return '[]';
  }
}

function isRetryableErrorMessage_(msg) {
  msg = String(msg || '');
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
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
      const cn = safeString_(ex.cn);
      const py = safeString_(ex.py);
      const vi = safeString_(ex.vi);
      if (!cn && !py && !vi) return '';
      return `CN=${cn}|PY=${py}|VI=${vi}`;
    })
    .filter(Boolean)
    .join(' || ');
}

function normalizeExamplesOutput_(examples) {
  if (!Array.isArray(examples)) return '';

  const normalized = examples
    .map(example => {
      const text = safeString_(example);
      if (text.startsWith('CN=') && text.includes('|PY=') && text.includes('|VI=')) {
        return text;
      }

      const parsed = parseExamples_(text);
      if (!parsed.length) return '';
      return formatExamples_([parsed[0]]);
    })
    .filter(Boolean)
    .map(text => text.replace(/\s*\|\|\s*/g, ' || '));

  return [...new Set(normalized)].join(' || ');
}

function normalizeReadingCandidates_(values) {
  if (!Array.isArray(values)) return '';

  const normalized = values
    .map(value => safeString_(value))
    .filter(Boolean)
    .map(value => {
      const parts = value.split('|').map(part => safeString_(part));
      let pinyin = '';
      let meanings = '';

      parts.forEach(part => {
        if (part.indexOf('PINYIN=') === 0) pinyin = safeString_(part.slice(7));
        if (part.indexOf('MEANINGS=') === 0) meanings = safeString_(part.slice(9));
      });

      if (!pinyin && !meanings) return '';
      return `PINYIN=${pinyin}|MEANINGS=${meanings}`;
    })
    .filter(Boolean);

  return [...new Set(normalized)].join(' || ');
}

function normalizeGrammarExamplesOutput_(examples) {
  if (!Array.isArray(examples)) return '';

  const normalized = examples
    .map(example => {
      if (typeof example === 'string') {
        const text = safeString_(example);
        if (text.startsWith('CN=') && text.includes('|PY=') && text.includes('|VI=')) {
          return text;
        }
        return '';
      }

      return formatExamples_([{
        cn: example.chinese_text || example.cn,
        py: example.pinyin || example.py,
        vi: example.vietnamese_meaning || example.vi
      }]);
    })
    .filter(Boolean);

  return [...new Set(normalized)].join(' || ');
}

function normalizeTopicTags_(tags) {
  if (!Array.isArray(tags)) return [];
  const allowed = new Set(ALLOWED_TOPIC_TAGS);
  const normalized = tags
    .map(t => String(t || '').trim().toLowerCase())
    .filter(Boolean)
    .filter(t => allowed.has(t));
  return [...new Set(normalized)];
}

function normalizePartOfSpeech_(parts) {
  const allowed = new Set([
    'danh_tu',
    'dong_tu',
    'tinh_tu',
    'pho_tu',
    'luong_tu',
    'dai_tu',
    'gioi_tu',
    'tro_tu',
    'so_tu',
    'da_loai_tu',
    'unknown'
  ]);

  if (!Array.isArray(parts)) return [];

  const normalized = parts
    .map(p => String(p || '').trim().toLowerCase())
    .filter(Boolean)
    .filter(p => allowed.has(p));

  return [...new Set(normalized)];
}

function normalizeStructureType_(value) {
  const allowed = new Set([
    'hinh_thanh',
    'hoi_y',
    'tuong_hinh',
    'chi_su',
    'gia_ta',
    'khac',
    'khong_ro'
  ]);

  const v = String(value || '').trim().toLowerCase();
  return allowed.has(v) ? v : 'khong_ro';
}

function normalizeSourceConfidence_(value) {
  const allowed = new Set(['high', 'medium', 'low']);
  const v = String(value || '').trim().toLowerCase();
  return allowed.has(v) ? v : 'medium';
}

function normalizeReviewStatus_(value) {
  const allowed = new Set(['pending', 'needs_review', 'approved']);
  const v = String(value || '').trim().toLowerCase();
  return allowed.has(v) ? v : 'pending';
}

function normalizeBooleanString_(value) {
  return value === true || String(value).toLowerCase() === 'true' ? 'true' : 'false';
}

function normalizeHskLevel_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const match = raw.match(/\d+/);
  if (!match) return '';

  const num = match[0];
  const allowed = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  return allowed.has(num) ? num : '';
}

function getTagGroups_(tags) {
  if (!Array.isArray(tags)) return [];

  const groups = tags
    .map(tag => TAG_TO_GROUP[tag])
    .filter(Boolean);

  return [...new Set(groups)];
}

function normalizeTextLoose_(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildRadicalAliasMap_() {
  const map = {};

  RADICAL_LIST.forEach(item => {
    const canonical = item.trim();
    const lowerCanonical = normalizeTextLoose_(canonical);
    map[lowerCanonical] = canonical;

    const hanMatches = canonical.match(/[\u2E80-\u2FD5\u3400-\u9FFF\uF900-\uFAFF⺀-⻳𠀀-𪛟]+/gu) || [];
    hanMatches.forEach(h => {
      map[normalizeTextLoose_(h)] = canonical;
    });

    const nameOnly = canonical.split(/[\u2E80-\u2FD5\u3400-\u9FFF\uF900-\uFAFF⺀-⻳𠀀-𪛟]/u)[0].trim();
    if (nameOnly) {
      map[normalizeTextLoose_(nameOnly)] = canonical;
    }

    const parenMatches = canonical.match(/\(([^)]+)\)/g) || [];
    parenMatches.forEach(pm => {
      const inner = pm.replace(/[()]/g, '');
      inner.split(',').forEach(alias => {
        const a = alias.trim();
        if (a) {
          map[normalizeTextLoose_(a)] = canonical;
        }
      });
    });
  });

  return map;
}

function getRadicalAliasMap_() {
  if (!globalThis.__RADICAL_ALIAS_MAP__) {
    globalThis.__RADICAL_ALIAS_MAP__ = buildRadicalAliasMap_();
  }
  return globalThis.__RADICAL_ALIAS_MAP__;
}

function normalizeSingleRadical_(value) {
  const raw = normalizeTextLoose_(value);
  if (!raw) return '';

  const aliasMap = getRadicalAliasMap_();
  if (aliasMap[raw]) return aliasMap[raw];

  const parts = raw.split(/[;,/|]+/).map(x => x.trim()).filter(Boolean);
  for (const p of parts) {
    if (aliasMap[p]) return aliasMap[p];
  }

  return '';
}

function normalizeRadicalList_(values) {
  if (!Array.isArray(values)) return [];

  const normalized = values
    .map(v => normalizeSingleRadical_(v))
    .filter(Boolean);

  return [...new Set(normalized)];
}

function normalizeComponentBreakdown_(items) {
  if (!Array.isArray(items)) return [];

  return items.map(item => {
    return {
      character: safeString_(item.character),
      components: Array.isArray(item.components)
        ? item.components.map(x => safeString_(x)).filter(Boolean)
        : [],
      main_radicals: normalizeRadicalList_(item.main_radicals),
      structure_type: normalizeStructureType_(item.structure_type),
      structure_note: safeString_(item.structure_note)
    };
  }).filter(x => x.character);
}

function writeExecutionMeta_(sheet, row, meta) {
  meta = meta || {};

  try {
    sheet.getRange(row, CONFIG.COL_LAST_API_KEY).setValue(
      meta.apiKey ? maskApiKey_(meta.apiKey) : ''
    );

    sheet.getRange(row, CONFIG.COL_LAST_MODEL).setValue(meta.model || '');
    sheet.getRange(row, CONFIG.COL_LAST_DURATION_MS).setValue(meta.durationMs || '');
  } catch (err) {
    console.log('[META] writeExecutionMeta error: ' + err.message);
  }
}

function touchRowUpdatedAt_(sheet, row) {
  if (!sheet || row <= CONFIG.HEADER_ROW) return;
  const kind = getSheetKind_(sheet);
  if (kind === 'hanzi') {
    sheet.getRange(row, CONFIG.COL_UPDATED_AT).setValue(now_());
    return;
  }

  if (kind === 'grammar') {
    sheet.getRange(row, GRAMMAR_COL.UPDATED_AT).setValue(now_());
  }
}

function shouldProcessStatus_(aiStatus) {
  const status = safeString_(aiStatus);
  return status === 'pending' || status === 'retry_later';
}

function validateConfig_() {
  if (CONFIG.COL_INPUT_TEXT !== 1) {
    throw new Error('CONFIG.COL_INPUT_TEXT must start at column 1');
  }

  if (CONFIG.COL_LAST_DURATION_MS !== CONFIG.HEADER_WIDTH) {
    throw new Error('CONFIG.HEADER_WIDTH must match the last configured column');
  }

  if (HANZI_HEADERS.length !== CONFIG.HEADER_WIDTH) {
    throw new Error('HANZI_HEADERS length does not match CONFIG.HEADER_WIDTH');
  }

  if (GRAMMAR_HEADERS.length !== CONFIG.GRAMMAR_HEADER_WIDTH) {
    throw new Error('GRAMMAR_HEADERS length does not match CONFIG.GRAMMAR_HEADER_WIDTH');
  }

  if (CONFIG.AI_MICRO_BATCH_SIZE < 1) {
    throw new Error('CONFIG.AI_MICRO_BATCH_SIZE must be >= 1');
  }

  if (CONFIG.WORKER_COUNT < 1) {
    throw new Error('CONFIG.WORKER_COUNT must be >= 1');
  }

  getGeminiApiKeys_();
  getGeminiWeightedModels_();
}

function validateHeader_() {
  validateSheetHeader_(getHanziSheet_(), HANZI_HEADERS, CONFIG.HEADER_WIDTH, 'Hanzi');
  validateSheetHeader_(getGrammarSheet_(), GRAMMAR_HEADERS, CONFIG.GRAMMAR_HEADER_WIDTH, 'NguPhap');
  return true;
}

function validateSheetHeader_(sheet, expectedHeaders, width, label) {
  const actualHeaders = sheet
    .getRange(CONFIG.HEADER_ROW, 1, 1, width)
    .getValues()[0]
    .map(value => safeString_(value));

  const mismatches = [];
  for (let index = 0; index < expectedHeaders.length; index++) {
    if (actualHeaders[index] !== expectedHeaders[index]) {
      mismatches.push(
        `col ${index + 1}: expected "${expectedHeaders[index]}", got "${actualHeaders[index]}"`
      );
    }
  }

  if (mismatches.length) {
    throw new Error(`${label} header mismatch:\n${mismatches.join('\n')}`);
  }
}
