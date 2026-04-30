function createAutoPendingTrigger() {
  deleteAutoPendingTriggers_();

  ScriptApp.newTrigger('autoProcessPendingRows')
    .timeBased()
    .everyMinutes(5)
    .create();
}

function deleteAutoPendingTriggers_() {
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoProcessPendingRows') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function resetAutoPendingTrigger() {
  deleteAutoPendingTriggers_();
  createAutoPendingTrigger();
}

function listProjectTriggersInfo() {
  const triggers = ScriptApp.getProjectTriggers();
  const lines = triggers.map((t, idx) => {
    return `${idx + 1}. ${t.getHandlerFunction()} | ${t.getEventType()} | ${t.getTriggerSource()}`;
  });

  SpreadsheetApp.getUi().alert(
    lines.length ? lines.join('\n') : 'No project triggers found.'
  );
}

function resetAutoPendingTriggerToFiveMinutes() {
  deleteAutoPendingTriggers_();

  ScriptApp.newTrigger('autoProcessPendingRows')
    .timeBased()
    .everyMinutes(5)
    .create();
}