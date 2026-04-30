function getGeminiApiKeys_() {
  const props = PropertiesService.getScriptProperties();

  const rawKeys = props.getProperty('GEMINI_API_KEYS');

  // Ưu tiên GEMINI_API_KEYS
  if (rawKeys) {
    try {
      const parsed = JSON.parse(rawKeys);
      if (Array.isArray(parsed)) {
        const keys = parsed
          .map(k => String(k || '').trim())
          .filter(Boolean);

        if (keys.length > 0) return keys;
      }
    } catch (err) {
      // fallback xuống format newline/comma
      const keys = rawKeys
        .split(/[\n,]+/)
        .map(k => k.trim())
        .filter(Boolean);

      if (keys.length > 0) return keys;
    }
  }

  // Backward compatible với key cũ
  const singleKey = props.getProperty('GEMINI_API_KEY');
  if (singleKey) return [singleKey.trim()];

  throw new Error('Missing GEMINI_API_KEYS or GEMINI_API_KEY in Script Properties');
}

function getApiKeyRoundRobinIndex_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('GEMINI_KEY_RR_INDEX');
  const idx = parseInt(raw || '0', 10);
  return Number.isNaN(idx) ? 0 : idx;
}

function setApiKeyRoundRobinIndex_(index) {
  PropertiesService
    .getScriptProperties()
    .setProperty('GEMINI_KEY_RR_INDEX', String(index));
}

function getRoundRobinOrderedApiKeys_() {
  const keys = getGeminiApiKeys_();
  const start = getApiKeyRoundRobinIndex_() % keys.length;

  const ordered = [];
  for (let i = 0; i < keys.length; i++) {
    ordered.push(keys[(start + i) % keys.length]);
  }

  return ordered;
}

function advanceApiKeyRoundRobinPointer_() {
  const keys = getGeminiApiKeys_();
  const nextIndex = (getApiKeyRoundRobinIndex_() + 1) % keys.length;
  setApiKeyRoundRobinIndex_(nextIndex);
}

function resetApiKeyRoundRobinPointer_() {
  setApiKeyRoundRobinIndex_(0);
}

function maskApiKey_(key) {
  const s = String(key || '');
  if (s.length <= 10) return '***';
  return s.slice(0, 6) + '...' + s.slice(-4);
}