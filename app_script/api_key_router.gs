function getGeminiApiKeyByIndex_(index) {
  const keys = getGeminiApiKeys_();
  if (!keys.length) throw new Error('No Gemini API keys configured');
  return keys[index % keys.length];
}

function getGeminiApiKeys_() {
  const props = PropertiesService.getScriptProperties();
  const rawKeys = props.getProperty('GEMINI_API_KEYS');

  if (rawKeys) {
    try {
      const parsed = JSON.parse(rawKeys);
      if (Array.isArray(parsed)) {
        const keys = parsed.map(k => String(k || '').trim()).filter(Boolean);
        if (keys.length) return keys;
      }
    } catch (err) {
      const keys = rawKeys.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
      if (keys.length) return keys;
    }
  }

  const singleKey = props.getProperty('GEMINI_API_KEY');
  if (singleKey) return [singleKey.trim()];

  throw new Error('Missing GEMINI_API_KEYS or GEMINI_API_KEY');
}

function getGeminiApiKeyCount_() {
  return getGeminiApiKeys_().length;
}

function maskApiKey_(key) {
  const s = String(key || '');
  if (s.length <= 10) return '***';
  return s.slice(0, 6) + '...' + s.slice(-4);
}

function getApiKeyRoundRobinIndex_() {
  const raw = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY_RR_INDEX');
  const idx = parseInt(raw || '0', 10);
  return Number.isNaN(idx) ? 0 : idx;
}

function setApiKeyRoundRobinIndex_(index) {
  PropertiesService.getScriptProperties().setProperty('GEMINI_KEY_RR_INDEX', String(index));
}

function takeNextGeminiApiKey_() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error('Cannot acquire API key pointer lock');
  }

  try {
    const keys = getGeminiApiKeys_();
    const idx = getApiKeyRoundRobinIndex_() % keys.length;
    const apiKey = keys[idx];

    setApiKeyRoundRobinIndex_((idx + 1) % keys.length);

    return {
      apiKey,
      keyIndex: idx
    };
  } finally {
    lock.releaseLock();
  }
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

