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

function safeJsonString_(value) {
  try {
    return JSON.stringify(value || []);
  } catch (err) {
    return '[]';
  }
}

function joinArray_(value, separator) {
  if (!Array.isArray(value)) return '';
  return value
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .join(separator || ' | ');
}

function normalizeTextLoose_(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function maskApiKey_(key) {
  const value = safeString_(key);
  if (!value) return '';
  if (value.length <= 10) return '***';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function isRetryableErrorMessage_(msg) {
  msg = String(msg || '').toUpperCase();
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('RECITATION') ||
    msg.includes('JSON') ||
    msg.includes('UNTERMINATED STRING') ||
    msg.includes('Unterminated string in JSON') ||
    msg.includes('Unexpected end of JSON') ||
    msg.includes('JSON parse error') ||
    msg.includes('Gemini returned malformed JSON') ||
    msg.includes('MAX_TOKENS')
  );
}
