/**
 * PERT — computes earliest/latest start, slack, critical path from Tasks tab.
 * Writes results to a "PERT" sheet and draws a simple node-link diagram
 * with cell colouring (no SlidesApp dependency needed).
 *
 * Tasks.depends is a comma-separated list of task IDs.
 */
function renderPert() {
  const ss = SpreadsheetApp.getActive();
  const data = ss.getSheetByName(TABS.tasks).getDataRange().getValues();
  if (data.length < 2) { SpreadsheetApp.getUi().alert('No tasks.'); return; }

  // Build map id -> task
  const tasks = {};
  data.slice(1).forEach(r => {
    const [id,, title, start, end, depends] = r;
    if (!id) return;
    const dur = (new Date(end) - new Date(start)) / 86400000 + 1;
    tasks[id] = {
      id, title, dur: Math.max(0, dur),
      deps: depends ? String(depends).split(',').map(s => s.trim()).filter(Boolean) : [],
      es: 0, ef: 0, ls: 0, lf: 0, slack: 0
    };
  });

  // Topological order
  const order = topo_(tasks);

  // Forward pass
  order.forEach(id => {
    const t = tasks[id];
    t.es = t.deps.reduce((m, d) => Math.max(m, tasks[d] ? tasks[d].ef : 0), 0);
    t.ef = t.es + t.dur;
  });
  const projectEnd = Math.max(...Object.values(tasks).map(t => t.ef));

  // Backward pass
  order.slice().reverse().forEach(id => {
    const t = tasks[id];
    const successors = Object.values(tasks).filter(x => x.deps.includes(id));
    t.lf = successors.length ? Math.min(...successors.map(s => s.ls)) : projectEnd;
    t.ls = t.lf - t.dur;
    t.slack = t.ls - t.es;
  });

  // Write to sheet
  let p = ss.getSheetByName('PERT') || ss.insertSheet('PERT');
  p.clear();
  p.getRange(1, 1, 1, 8).setValues([['id','title','dur','ES','EF','LS','LF','slack']]).setFontWeight('bold');
  const out = order.map(id => {
    const t = tasks[id];
    return [t.id, t.title, t.dur, t.es, t.ef, t.ls, t.lf, t.slack];
  });
  if (out.length) p.getRange(2, 1, out.length, 8).setValues(out);

  // Highlight critical path (slack === 0) in red
  out.forEach((row, i) => {
    if (row[7] === 0) p.getRange(i + 2, 1, 1, 8).setBackground('#ff7b72');
  });

  p.getRange('J1').setValue('Project duration (days):').setFontWeight('bold');
  p.getRange('K1').setValue(projectEnd);

  audit('renderPert', 'PERT', 'duration=' + projectEnd + 'd, critical=' +
    out.filter(r => r[7] === 0).map(r => r[0]).join('→'));
  ss.setActiveSheet(p);
}

function topo_(tasks) {
  const order = [], seen = {};
  function visit(id) {
    if (seen[id] || !tasks[id]) return;
    seen[id] = true;
    tasks[id].deps.forEach(visit);
    order.push(id);
  }
  Object.keys(tasks).forEach(visit);
  return order;
}
