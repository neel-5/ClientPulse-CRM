function refreshDashboard() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CP.DASHBOARD);
  const leads = SpreadsheetApp.getActive().getSheetByName(CP.LEADS);
  if (!sheet || !leads) throw new Error('Dashboard or Leads sheet is missing.');

  sheet.clear();
  sheet.getRange('A1:F1').merge().setValue('ClientPulse CRM Dashboard')
    .setFontSize(20).setFontWeight('bold').setFontColor('#ffffff').setBackground('#13253f');
  sheet.getRange('A3:B8').setValues([
    ['Metric', 'Value'],
    ['Total leads', '=COUNTA(Leads!A2:A)'],
    ['Won leads', '=COUNTIF(Leads!G2:G,"Won")'],
    ['Conversion rate', '=IFERROR(B5/B4,0)'],
    ['Pipeline value', '=SUMIFS(Leads!I2:I,Leads!G2:G,"<>Won",Leads!G2:G,"<>Lost")'],
    ['Overdue follow-ups', '=COUNTIFS(Followups!E2:E,"pending",Followups!C2:C,"<"&NOW())'],
  ]);
  sheet.getRange('A3:B3').setFontWeight('bold').setBackground('#eaf1ff');
  sheet.getRange('B6').setNumberFormat('0.0%');
  sheet.getRange('B7').setNumberFormat('₹#,##0');

  sheet.getRange('D3:E3').setValues([['Stage', 'Lead Count']]).setFontWeight('bold').setBackground('#eaf1ff');
  sheet.getRange('D4:D9').setValues([['New'], ['Contacted'], ['Interested'], ['Demo Scheduled'], ['Won'], ['Lost']]);
  sheet.getRange('E4').setFormula('=COUNTIF(Leads!G:G,D4)');
  sheet.getRange('E4:E9').fillDown();

  const existing = sheet.getCharts();
  existing.forEach(chart => sheet.removeChart(chart));
  const chart = sheet.newChart()
    .asColumnChart()
    .addRange(sheet.getRange('D3:E9'))
    .setPosition(11, 1, 0, 0)
    .setOption('title', 'Pipeline distribution')
    .setOption('legend', { position: 'none' })
    .setOption('colors', ['#3975f6'])
    .build();
  sheet.insertChart(chart);
  sheet.autoResizeColumns(1, 6);
}
