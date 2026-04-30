function getModelPool_() {
  const models = CONFIG.GEMINI_MODELS || [];
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error('CONFIG.GEMINI_MODELS is empty');
  }
  return models;
}

function getRoundRobinIndex_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('GEMINI_RR_INDEX');
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