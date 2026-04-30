function getModelPool_() {
  if (Array.isArray(CONFIG.GEMINI_MODEL_WEIGHTS) && CONFIG.GEMINI_MODEL_WEIGHTS.length) {
    const pool = [];

    CONFIG.GEMINI_MODEL_WEIGHTS.forEach(item => {
      const model = String(item.model || '').trim();
      const weight = Number(item.weight || 0);

      if (!model || weight <= 0) return;

      for (let i = 0; i < weight; i++) {
        pool.push(model);
      }
    });

    if (pool.length) return pool;
  }

  if (Array.isArray(CONFIG.GEMINI_MODELS) && CONFIG.GEMINI_MODELS.length) {
    return CONFIG.GEMINI_MODELS;
  }

  throw new Error('No Gemini models configured');
}

function getRoundRobinIndex_() {
  const raw = PropertiesService.getScriptProperties().getProperty('GEMINI_RR_INDEX');
  const idx = parseInt(raw || '0', 10);
  return Number.isNaN(idx) ? 0 : idx;
}

function setRoundRobinIndex_(index) {
  PropertiesService.getScriptProperties().setProperty('GEMINI_RR_INDEX', String(index));
}

function getRoundRobinOrderedModels_() {
  const models = getModelPool_();
  const start = getRoundRobinIndex_() % models.length;

  const ordered = [];
  for (let i = 0; i < models.length; i++) {
    ordered.push(models[(start + i) % models.length]);
  }
  return ordered;
}

function advanceRoundRobinPointer_() {
  const models = getModelPool_();
  const nextIndex = (getRoundRobinIndex_() + 1) % models.length;
  setRoundRobinIndex_(nextIndex);
}

function resetRoundRobinPointer_() {
  setRoundRobinIndex_(0);
}

function takeNextGeminiModel_() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw new Error('Cannot acquire model pointer lock');
  }

  try {
    const models = getModelPool_();
    const idx = getRoundRobinIndex_() % models.length;
    const model = models[idx];

    setRoundRobinIndex_((idx + 1) % models.length);

    return {
      model,
      modelIndex: idx
    };
  } finally {
    lock.releaseLock();
  }
}