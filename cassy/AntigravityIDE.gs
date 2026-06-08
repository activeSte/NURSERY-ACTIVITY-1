/**
 * Cassy — Antigravity IDE bridge.
 *
 * Connects Cassy to the BMS Antigravity IDE workspace (a Google Sheet hub
 * shared with the Coordinators Team of AI Assistants).
 *
 * Setup (one time):
 *   Apps Script → Project Settings → Script Properties:
 *     ANTIGRAVITY_SHEET_ID  = <spreadsheet ID of the Antigravity IDE hub>
 *     ANTIGRAVITY_OWNER     = S1.PINATO@gmail.com  (default: CASSY.owner)
 *
 * Hub spreadsheet tabs expected (auto-created on first call):
 *   AgentInbox   | ts, from, subject, body, status
 *   AgentOutbox  | ts, from, to, subject, body, status
 *   AgentLog     | ts, agent, action, detail
 *
 * Protocol:
 *   - Cassy POSTS to AgentOutbox (never sends externally without approval).
 *   - Cassy READS from AgentInbox to receive tasks from coordinators.
 *   - Every interaction is written to AgentLog (audit).
 */

function Cassy_antigravityId_() {
  return PropertiesService.getScriptProperties().getProperty('ANTIGRAVITY_SHEET_ID') || '';
}

function Cassy_antigravityEnabled_() {
  return !!Cassy_antigravityId_();
}

function Cassy_antigravitySS_() {
  const id = Cassy_antigravityId_();
  if (!id) throw new Error('ANTIGRAVITY_SHEET_ID not set in Script Properties.');
  return SpreadsheetApp.openById(id);
}

/** Ensure the three hub tabs exist, create them if not. */
function Cassy_antigravityInit_() {
  const ss = Cassy_antigravitySS_();
  const tabs = {
    AgentInbox:  ['ts', 'from', 'subject', 'body', 'status'],
    AgentOutbox: ['ts', 'from', 'to', 'subject', 'body', 'status'],
    AgentLog:    ['ts', 'agent', 'action', 'detail']
  };
  Object.entries(tabs).forEach(([name, hdr]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, hdr.length).setValues([hdr]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  audit('cassy.antigravity', 'init', 'hub tabs verified');
  return 'Antigravity IDE hub initialised.';
}

/**
 * POST — Send a message/digest from Cassy to the Coordinator team outbox.
 * status starts as 'pending' (coordinator approves before any external action).
 */
function Cassy_sendToAntigravity_(subject, body, toAgent) {
  if (!Cassy_antigravityEnabled_()) return;
  const ss = Cassy_antigravitySS_();
  let sh = ss.getSheetByName('AgentOutbox');
  if (!sh) { Cassy_antigravityInit_(); sh = ss.getSheetByName('AgentOutbox'); }
  const from = 'Cassy';
  const to = toAgent || 'Coordinators';
  sh.appendRow([new Date(), from, to, subject, body, 'pending']);
  Cassy_antigravityLog_('Cassy', 'send', subject + ' → ' + to);
}

/**
 * READ — Pull open tasks from AgentInbox assigned to Cassy.
 * Returns array of {ts, from, subject, body} for status = 'open'.
 */
function Cassy_readFromAntigravity_() {
  if (!Cassy_antigravityEnabled_()) return [];
  const ss = Cassy_antigravitySS_();
  let sh = ss.getSheetByName('AgentInbox');
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  const tasks = [];
  for (let i = 1; i < rows.length; i++) {
    const [ts, from, subject, body, status] = rows[i];
    if ((status + '').toLowerCase() === 'open') {
      tasks.push({ ts, from, subject, body, row: i + 1 });
    }
  }
  Cassy_antigravityLog_('Cassy', 'read', tasks.length + ' open tasks');
  return tasks;
}

/** Mark a task row in AgentInbox as handled. */
function Cassy_markTaskHandled_(rowIndex) {
  const ss = Cassy_antigravitySS_();
  const sh = ss.getSheetByName('AgentInbox');
  if (!sh) return;
  sh.getRange(rowIndex, 5).setValue('handled');
}

/** Write to AgentLog. */
function Cassy_antigravityLog_(agent, action, detail) {
  const ss = Cassy_antigravitySS_();
  let sh = ss.getSheetByName('AgentLog');
  if (!sh) return;
  sh.appendRow([new Date(), agent, action, detail || '']);
}

/**
 * Morning Brief extended: after local delivery, also posts to Antigravity IDE.
 * Called automatically if ANTIGRAVITY_SHEET_ID is set.
 */
function Cassy_antigravityPostBrief_(subject, body) {
  if (!Cassy_antigravityEnabled_()) return;
  Cassy_sendToAntigravity_('[Cassy Brief] ' + subject, body, 'Coordinators');
}

/**
 * Check-in: Cassy reads open tasks from Antigravity IDE AgentInbox and returns
 * a summary. Called from the Web App panel "Antigravity IDE" card.
 */
function cassyAntigravityCheckin() {
  if (!Cassy_antigravityEnabled_()) {
    return { enabled: false, tasks: [], log: 'ANTIGRAVITY_SHEET_ID not set. Add it in Project Settings → Script Properties.' };
  }
  const tasks = Cassy_readFromAntigravity_();
  Cassy_antigravityLog_('Cassy', 'checkin', 'panel check-in');
  return { enabled: true, tasks: tasks, log: tasks.length + ' open tasks from coordinators.' };
}

/**
 * UI: send a message from the panel to the Antigravity IDE outbox.
 * Never sends externally — lands in AgentOutbox with status 'pending'.
 */
function cassyAntigravitySend(subject, body, toAgent) {
  Cassy_sendToAntigravity_(subject, body, toAgent || 'Coordinators');
  audit('cassy.antigravity', 'send', subject);
  return 'Sent to Antigravity IDE outbox (status: pending · awaiting coordinator approval).';
}

/**
 * UI: initialise or verify the hub tabs in the Antigravity IDE spreadsheet.
 */
function cassyAntigravitySetup() {
  return Cassy_antigravityInit_();
}
