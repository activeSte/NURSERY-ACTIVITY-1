/**
 * Charts — builds a Dashboard tab with pipeline funnel + monthly revenue.
 */
function buildDashboard() {
  const ss = SpreadsheetApp.getActive();
  const src = ss.getSheetByName(TABS.deals);
  let dash = ss.getSheetByName(TABS.dash) || ss.insertSheet(TABS.dash);
  dash.clear();

  // 1. Pipeline funnel: count of deals per stage
  dash.getRange('A1').setValue('Stage').setFontWeight('bold');
  dash.getRange('B1').setValue('Deals').setFontWeight('bold');
  STAGES.forEach((s, i) => {
    dash.getRange(i + 2, 1).setValue(s);
    dash.getRange(i + 2, 2).setFormula(
      `=COUNTIF('${TABS.deals}'!D:D,"${s}")`
    );
  });
  const funnel = dash.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(dash.getRange(1, 1, STAGES.length + 1, 2))
    .setPosition(2, 4, 0, 0)
    .setOption('title', 'Pipeline (deals per stage)')
    .setOption('legend', { position: 'none' })
    .build();
  dash.insertChart(funnel);

  // 2. Monthly revenue (sum of value of Won deals by month opened)
  dash.getRange('A10').setValue('Month').setFontWeight('bold');
  dash.getRange('B10').setValue('Revenue (€)').setFontWeight('bold');
  for (let i = 0; i < 12; i++) {
    const month = i + 1;
    dash.getRange(11 + i, 1).setValue(Utilities.formatDate(new Date(2025, i, 1), 'GMT', 'MMM'));
    dash.getRange(11 + i, 2).setFormula(
      `=SUMPRODUCT((MONTH('${TABS.deals}'!F2:F)=${month})*('${TABS.deals}'!D2:D="Won")*'${TABS.deals}'!E2:E)`
    );
  }
  const rev = dash.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(dash.getRange(10, 1, 13, 2))
    .setPosition(15, 4, 0, 0)
    .setOption('title', 'Monthly revenue (Won deals)')
    .setOption('legend', { position: 'none' })
    .build();
  dash.insertChart(rev);

  audit('buildDashboard', TABS.dash, '');
  ss.setActiveSheet(dash);
}
