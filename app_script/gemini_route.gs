function takeNextGeminiRoute_() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(3000)) {
    throw new Error('Cannot acquire Gemini route lock');
  }

  try {
    const keys = getGeminiApiKeys_();
    const models = getModelPool_();

    const keyIndex = getApiKeyRoundRobinIndex_() % keys.length;
    const modelIndex = getRoundRobinIndex_() % models.length;

    const apiKey = keys[keyIndex];
    const model = models[modelIndex];

    setApiKeyRoundRobinIndex_((keyIndex + 1) % keys.length);
    setRoundRobinIndex_((modelIndex + 1) % models.length);

    return {
      apiKey,
      model,
      keyIndex,
      modelIndex
    };
  } finally {
    lock.releaseLock();
  }
}