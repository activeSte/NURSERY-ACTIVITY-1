/**
 * Gantt — renders a date-grid Gantt on a dedicated tab using conditional cell colour.
 * One row per Task, one column per day between min(start) and max(end).
 */
function renderGantt() {
  const ss = SpreadsheetApp.getActive();
  const tasks = ss.getSheetByName(TABS.tasks).getDataRange().getValues();
  if (tasks.length < 2) {
    SpreadsheetApp.getUi().alert('No tasks to draw.');
    return;
  }
  const rows = tasks.slice(1).filter(r => r[3] && r[4]);   // need start + end
  const minD = new Date(Math.min(...rows.map(r => new Date(r[3]).getTime())));
  const maxD = new Date(Math.max(...rows.map(r => new Date(r[4]).getTime())));
  const days = Math.round((maxD - minD) / 86400000) + 1;

  let g = ss.getSheetByName('Gantt') || ss.insertSheet('Gantt');
  g.clear();

  // Header row: dates
  g.getRange(1, 1).setValue('Task').setFontWeight('bold');
  for (let d = 0; d < days; d++) {
    const date = new Date(minD.getTime() + d * 86400000);
    g.getRange(1, 2 + d)
      .setValue(Utilities.formatDate(date, 'GMT', 'MM-dd'))
      .setFontSize(8)
      .setHorizontalAlignment('center');
  }
  g.setFrozenRows(1);
  g.setFrozenColumns(1);

  // Body
  rows.forEach((r, i) => {
    const [id, dealId, title, start, end, , status] = r;
    g.getRange(i + 2, 1).setValue(id + ' · ' + title);
    const sIdx = Math.round((new Date(start) - minD) / 86400000);
    const eIdx = Math.round((new Date(end)   - minD) / 86400000);
    const colour = status === 'done' ? '#7ee787' : (status === 'blocked' ? '#ff7b72' : '#5cc8ff');
    g.getRange(i + 2, 2 + sIdx, 1, eIdx - sIdx + 1).setBackground(colour);
  });

  g.setColumnWidths(2, days, 22);
  audit('renderGantt', 'Gantt', rows.length + ' tasks');
  ss.setActiveSheet(g);
}
