function applyLeadValidation() {
  const ss = SpreadsheetApp.getActive();
  const leads = ss.getSheetByName(CP.LEADS);
  const lists = ss.getSheetByName(CP.VALIDATION);
  if (!leads || !lists) throw new Error('Leads or Validation Lists sheet is missing.');

  const stages = [['Stages'], ['New'], ['Contacted'], ['Interested'], ['Demo Scheduled'], ['Won'], ['Lost']];
  const sources = [['Lead Sources'], ['Manual'], ['WhatsApp'], ['Referral'], ['Website'], ['Google Ads'], ['Instagram'], ['LinkedIn']];
  lists.clearContents();
  lists.getRange(1, 1, stages.length, 1).setValues(stages);
  lists.getRange(1, 2, sources.length, 1).setValues(sources);

  const stageRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange('A2:A7'), true)
    .setAllowInvalid(false)
    .setHelpText('Choose a ClientPulse pipeline stage.')
    .build();
  const sourceRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange('B2:B8'), true)
    .setAllowInvalid(false)
    .setHelpText('Choose a standard lead source.')
    .build();

  leads.getRange('G2:G1000').setDataValidation(stageRule);
  leads.getRange('F2:F1000').setDataValidation(sourceRule);
  applyConditionalFormatting_();
}

function applyConditionalFormatting_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CP.LEADS);
  const range = sheet.getRange('A2:M1000');
  const rules = [
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$G2="Won"').setBackground('#e6f8f1').setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$G2="Lost"').setBackground('#f1f3f5').setFontColor('#7d8794').setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$J2>=80').setBackground('#fff2d5').setRanges([sheet.getRange('J2:J1000')]).build(),
  ];
  sheet.setConditionalFormatRules(rules);
}
