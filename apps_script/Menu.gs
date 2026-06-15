function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ClientPulse CRM')
    .addItem('Refresh CRM data', 'refreshClientPulseData')
    .addItem('Refresh dashboard', 'refreshDashboard')
    .addSeparator()
    .addItem('Apply lead validation', 'applyLeadValidation')
    .addItem('Mark overdue follow-ups', 'markOverdueFollowUps')
    .addSeparator()
    .addItem('Create reminder trigger', 'createFollowUpTrigger')
    .addItem('Run full setup', 'setupClientPulse')
    .addToUi();
}

function refreshClientPulseData() {
  const leads = apiRequest_('/api/leads', 'get');
  const followups = apiRequest_('/api/followups', 'get');
  writeObjects_(CP.LEADS, leads);
  writeObjects_(CP.FOLLOWUPS, followups);
  applyLeadValidation();
  refreshDashboard();
  SpreadsheetApp.getActive().toast(`${leads.length} leads synced`, 'ClientPulse CRM');
}

function writeObjects_(sheetName, rows) {
  if (!rows.length) return;
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const headers = Object.keys(rows[0]);
  const values = rows.map(row => headers.map(header => row[header] ?? ''));
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  sheet.setFrozenRows(1);
}
