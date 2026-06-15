function createFollowUpTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'sendFollowUpReminders')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('sendFollowUpReminders').timeBased().everyDays(1).atHour(9).create();
}

function sendFollowUpReminders() {
  markOverdueFollowUps();
  const sheet = SpreadsheetApp.getActive().getSheetByName(CP.FOLLOWUPS);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(String);
  const dueIndex = headers.indexOf('due_at');
  const statusIndex = headers.indexOf('status');
  const noteIndex = headers.indexOf('note');
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const due = values.filter(row => row[statusIndex] === 'pending' && new Date(row[dueIndex]) <= tomorrow);
  if (!due.length) return;

  const recipient = Session.getActiveUser().getEmail();
  const lines = due.map(row => `• ${new Date(row[dueIndex]).toLocaleString()} — ${row[noteIndex] || 'Follow up'}`);
  MailApp.sendEmail(recipient, `ClientPulse: ${due.length} follow-up reminder(s)`, lines.join('\n'));
}

function markOverdueFollowUps() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CP.FOLLOWUPS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;
  const headers = values[0].map(String);
  const dueIndex = headers.indexOf('due_at');
  const statusIndex = headers.indexOf('status');
  const now = new Date();
  for (let row = 1; row < values.length; row++) {
    const overdue = values[row][statusIndex] === 'pending' && new Date(values[row][dueIndex]) < now;
    sheet.getRange(row + 1, 1, 1, headers.length).setBackground(overdue ? '#ffebed' : null);
  }
}
