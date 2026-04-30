function now_() {
  return new Date();
}

function safeString_(value) {
  return String(value || '').trim();
}

function safeNumberOrBlank_(value) {
  if (value === null || value === undefined || value === '') return '';
  return value;
}

function normalizeInputKey_(text) {
  return String(text || '').trim().toLowerCase();
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
  sheet.getRange(row, CONFIG.COL_UPDATED_AT).setValue(now_());
}

function shouldProcessStatus_(aiStatus) {
  const status = safeString_(aiStatus);
  return status === 'pending' || status === 'retry_later';
}