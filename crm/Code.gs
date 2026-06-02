/**
 * CRM — main entry point.
 * Design principles: checked & balanced · fair & square · clear & friendly.
 *
 * Tabs expected on the bound spreadsheet:
 *   Contacts  | id, name, email, phone, company, notes, createdAt
 *   Deals     | id, title, contactId, stage, value, openedAt, dueDate, notes
 *   Tasks     | id, dealId, title, start, end, depends, status, owner
 *   AuditLog  | ts, user, action, target, detail
 */

const TABS = {
  contacts: 'Contacts',
  deals:    'Deals',
  tasks:    'Tasks',
  audit:    'AuditLog',
  dash:     'Dashboard'
};

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('CRM')
    .addItem('① Initialise sheet', 'initSheet')
    .addSeparator()
    .addItem('Add deal from selected Gmail thread', 'addDealFromThreadPrompt')
    .addItem('Sync deals → Google Tasks',           'syncTasks')
    .addSeparator()
    .addItem('Build dashboard (charts)', 'buildDashboard')
    .addItem('Render Gantt',             'renderGantt')
    .addItem('Render PERT',              'renderPert')
    .addSeparator()
    .addItem('Toggle Gmail consent',     'toggleConsent')
    .addItem('Show audit log',           'showAudit')
    .addToUi();
}

function initSheet() {
  const ss = SpreadsheetApp.getActive();
  const headers = {
    Contacts: ['id','name','email','phone','company','notes','createdAt'],
    Deals:    ['id','title','contactId','stage','value','openedAt','dueDate','notes'],
    Tasks:    ['id','dealId','title','start','end','depends','status','owner'],
    AuditLog: ['ts','user','action','target','detail']
  };
  Object.entries(headers).forEach(([name, hdr]) => {
    let sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, hdr.length).setValues([hdr]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  audit('init', 'spreadsheet', 'tabs created/verified');
  SpreadsheetApp.getUi().alert('CRM ready. Open Gmail and reload the sheet to see the menu.');
}

/** Friendly prompt-driven version (works from Sheet UI). */
function addDealFromThreadPrompt() {
  Ethics.assertConsent();
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Add deal', 'Paste a Gmail thread permalink or thread ID:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const id = extractThreadId_(r.getResponseText().trim());
  if (!id) { ui.alert('Could not read a thread id.'); return; }
  const deal = addDealFromThread(id);
  ui.alert('Deal added: ' + deal.id + ' — ' + deal.title);
}

function addDealFromThread(threadId) {
  Ethics.assertConsent();
  Ethics.withinRateLimit('gmail.read');
  const thread = GmailApp.getThreadById(threadId);
  if (!thread) throw new Error('Thread not found: ' + threadId);
  const msg = thread.getMessages()[0];

  const ss = SpreadsheetApp.getActive();
  const deals = ss.getSheetByName(TABS.deals);
  const dealId = 'D' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMddHHmmss');
  const row = [
    dealId,
    Ethics.redactPII(msg.getSubject()).slice(0, 120),
    msg.getFrom(),
    'Lead',
    0,
    new Date(),
    '',
    'From Gmail: ' + thread.getPermalink()
  ];
  deals.appendRow(row);

  // Label the thread idempotently
  const label = GmailApp.getUserLabelByName('CRM/' + dealId) || GmailApp.createLabel('CRM/' + dealId);
  thread.addLabel(label);

  audit('addDeal', dealId, thread.getPermalink());
  return { id: dealId, title: row[1] };
}

function syncTasks() {
  Ethics.assertConsent();
  Ethics.withinRateLimit('tasks.write');
  const ss = SpreadsheetApp.getActive();
  const data = ss.getSheetByName(TABS.deals).getDataRange().getValues();
  const list = getOrCreateTaskList_('CRM');
  let n = 0;
  for (let i = 1; i < data.length; i++) {
    const [id, title, , stage, , , due] = data[i];
    if (!id || stage === 'Won' || stage === 'Lost') continue;
    Tasks.Tasks.insert({ title: '['+id+'] '+title, due: due ? new Date(due).toISOString() : null }, list.id);
    n++;
  }
  audit('syncTasks', 'CRM', n + ' tasks created');
  SpreadsheetApp.getUi().alert('Synced ' + n + ' open deals to Google Tasks.');
}

function showAudit() {
  SpreadsheetApp.getActive().setActiveSheet(SpreadsheetApp.getActive().getSheetByName(TABS.audit));
}

function toggleConsent() {
  const p = PropertiesService.getDocumentProperties();
  const cur = p.getProperty('gmailConsent') === 'true';
  p.setProperty('gmailConsent', String(!cur));
  SpreadsheetApp.getUi().alert('Gmail consent is now: ' + (!cur));
}

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

function audit(action, target, detail) {
  const sh = SpreadsheetApp.getActive().getSheetByName(TABS.audit);
  if (!sh) return;
  sh.appendRow([new Date(), Session.getActiveUser().getEmail(), action, target, detail || '']);
}

function extractThreadId_(s) {
  if (!s) return null;
  const m = s.match(/[#\/]([0-9a-f]{16,})/i);
  return m ? m[1] : (/^[0-9a-f]{16,}$/i.test(s) ? s : null);
}

function getOrCreateTaskList_(name) {
  const lists = Tasks.Tasklists.list().items || [];
  const found = lists.find(l => l.title === name);
  return found || Tasks.Tasklists.insert({ title: name });
}
