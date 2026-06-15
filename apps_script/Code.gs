/**
 * ClientPulse CRM - Google Apps Script companion.
 *
 * Setup:
 * 1. Create sheets named Leads, Followups, Dashboard, Validation Lists, Config.
 * 2. Paste each .gs file into the spreadsheet-bound Apps Script project.
 * 3. Put API Base URL and API Token in Config!B2:B3.
 * 4. Run setupClientPulse() once and approve the requested permissions.
 */
const CP = {
  LEADS: 'Leads',
  FOLLOWUPS: 'Followups',
  DASHBOARD: 'Dashboard',
  VALIDATION: 'Validation Lists',
  CONFIG: 'Config',
};

function setupClientPulse() {
  ensureClientPulseSheets_();
  applyLeadValidation();
  refreshDashboard();
  createFollowUpTrigger();
  SpreadsheetApp.getActive().toast('ClientPulse setup complete', 'ClientPulse CRM');
}

function ensureClientPulseSheets_() {
  const ss = SpreadsheetApp.getActive();
  [CP.LEADS, CP.FOLLOWUPS, CP.DASHBOARD, CP.VALIDATION, CP.CONFIG].forEach(name => {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });
}

function getConfig_(key) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CP.CONFIG);
  if (!sheet) throw new Error('Config sheet not found. Run setupClientPulse().');
  const values = sheet.getRange('A:B').getValues();
  const row = values.find(item => String(item[0]).trim() === key);
  return row ? String(row[1]).trim() : '';
}

function apiRequest_(path, method, payload) {
  const baseUrl = getConfig_('API Base URL').replace(/\/$/, '');
  const token = getConfig_('API Token');
  if (!baseUrl || !token) throw new Error('Set API Base URL and API Token in the Config sheet.');
  const options = {
    method: method || 'get',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${token}` },
    muteHttpExceptions: true,
  };
  if (payload) options.payload = JSON.stringify(payload);
  const response = UrlFetchApp.fetch(`${baseUrl}${path}`, options);
  if (response.getResponseCode() >= 400) {
    throw new Error(`ClientPulse API ${response.getResponseCode()}: ${response.getContentText()}`);
  }
  return JSON.parse(response.getContentText());
}
