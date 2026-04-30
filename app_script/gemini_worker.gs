function generateBatchEntriesWithGeminiForWorker_(batchItems, workerIndex) {
  const route = takeNextGeminiRoute_();

  const apiKey = route.apiKey;
  const model = route.model;
  const startedAt = Date.now();
  const keyMasked = maskApiKey_(apiKey);

  console.log(
    `[WORKER ${workerIndex}] GEMINI START keyIndex=${route.keyIndex} key=${keyMasked} modelIndex=${route.modelIndex} model=${model} size=${batchItems.length}`
  );

  try {
    const result = callGeminiBatchWithRetryPerModel_(model, apiKey, batchItems);
    const durationMs = Date.now() - startedAt;

    result.__meta = {
      apiKey,
      model,
      durationMs
    };

    console.log(
      `[WORKER ${workerIndex}] GEMINI SUCCESS key=${keyMasked} model=${model} duration=${durationMs}ms`
    );

    return result;
  } catch (err) {
    const durationMs = Date.now() - startedAt;

    err.__meta = {
      apiKey,
      model,
      durationMs
    };

    console.log(
      `[WORKER ${workerIndex}] GEMINI FAIL key=${keyMasked} model=${model} duration=${durationMs}ms error=${err.message}`
    );

    throw err;
  }
}

function callGeminiBatchWithRetryPerModel_(model, apiKey, batchItems) {
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRY_ATTEMPTS_PER_MODEL; attempt++) {
    try {
      return callGeminiBatchOnce_(model, apiKey, batchItems);
    } catch (err) {
      const msg = String(err.message || '');

      console.log(
        `[GEMINI BATCH] attempt=${attempt} failed model=${model} size=${batchItems.length} error=${msg}`
      );

      if (!isRetryableErrorMessage_(msg) || attempt === CONFIG.MAX_RETRY_ATTEMPTS_PER_MODEL) {
        throw err;
      }

      const jitter = Math.floor(Math.random() * 1000);
      const delay = Math.min(
        CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + jitter,
        12000
      );

      Utilities.sleep(delay);
    }
  }

  throw new Error(`Batch retry loop exited unexpectedly for model ${model}`);
}