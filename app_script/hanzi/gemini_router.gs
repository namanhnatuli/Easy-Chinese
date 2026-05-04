function getGeminiApiKeys_() {
  const props = PropertiesService.getScriptProperties();
  const rawMulti = safeString_(props.getProperty('GEMINI_API_KEYS'));
  if (rawMulti) {
    try {
      const parsed = JSON.parse(rawMulti);
      if (Array.isArray(parsed)) {
        const keys = parsed.map(v => safeString_(v)).filter(Boolean);
        if (keys.length) return keys;
      }
    } catch (err) {
      const splitKeys = rawMulti.split(/[\n,]+/).map(v => safeString_(v)).filter(Boolean);
      if (splitKeys.length) return splitKeys;
    }
  }
  const fallbackKey = safeString_(props.getProperty('GEMINI_API_KEY'));
  if (fallbackKey) return [fallbackKey];
  throw new Error('Missing GEMINI_API_KEYS or GEMINI_API_KEY');
}

function getGeminiWeightedModels_() {
  const models = (CONFIG.GEMINI_MODEL_WEIGHTS || []).map(m => ({
    model: safeString_(m.model),
    weight: Math.max(0, Number(m.weight))
  })).filter(m => m.model && m.weight > 0);
  if (!models.length) throw new Error('No valid models in CONFIG.GEMINI_MODEL_WEIGHTS');
  return models;
}

function getWeightedModelBySlot_(slot) {
  const models = getGeminiWeightedModels_();
  const totalWeight = models.reduce((sum, m) => sum + m.weight, 0);
  const normalizedSlot = ((slot % totalWeight) + totalWeight) % totalWeight;

  let cursor = 0;
  for (let i = 0; i < models.length; i++) {
    cursor += models[i].weight;
    if (normalizedSlot < cursor) return models[i].model;
  }
  return models[models.length - 1].model;
}

function takeNextGeminiRoute_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.ROUTE_LOCK_TIMEOUT_MS)) throw new Error('Cannot acquire Gemini route lock');

  try {
    const props = PropertiesService.getScriptProperties();
    const keys = getGeminiApiKeys_();
    const models = getGeminiWeightedModels_();
    const totalWeight = models.reduce((sum, m) => sum + m.weight, 0);
    
    const rawState = props.getProperty(CONFIG.GEMINI_ROUTE_STATE_PROPERTY);
    const state = rawState ? JSON.parse(rawState) : { keyIndex: 0, modelSlot: 0 };

    const keyIndex = state.keyIndex % keys.length;
    const model = getWeightedModelBySlot_(state.modelSlot % totalWeight);

    const nextState = {
      keyIndex: (keyIndex + 1) % keys.length,
      modelSlot: (state.modelSlot + 1) % totalWeight
    };
    props.setProperty(CONFIG.GEMINI_ROUTE_STATE_PROPERTY, JSON.stringify(nextState));

    return { apiKey: keys[keyIndex], model: model };
  } finally {
    lock.releaseLock();
  }
}
