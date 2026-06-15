/**
 * Deploy this script as a Web App to receive optional ClientPulse events.
 * Execute as: Me. Access: Anyone with the deployment URL.
 * Add a shared secret in Script Properties as CLIENTPULSE_WEBHOOK_SECRET.
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const expected = PropertiesService.getScriptProperties().getProperty('CLIENTPULSE_WEBHOOK_SECRET');
    if (expected && body.secret !== expected) return jsonResponse_({ ok: false, error: 'unauthorized' });

    const events = SpreadsheetApp.getActive().getSheetByName('Webhook Events')
      || SpreadsheetApp.getActive().insertSheet('Webhook Events');
    if (events.getLastRow() === 0) events.appendRow(['Received At', 'Event', 'Payload']);
    events.appendRow([new Date(), body.event || 'unknown', JSON.stringify(body.data || body)]);

    if (body.event === 'lead.updated') refreshClientPulseData();
    return jsonResponse_({ ok: true, received: body.event || 'unknown' });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
