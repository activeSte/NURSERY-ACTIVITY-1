/**
 * Cassy — Web App entry + JSON-RPC-ish backend for the control panel.
 * Deploy: Apps Script editor → Deploy → New deployment → Web app
 *         (Execute as: me · Access: only myself).
 * Also usable from the Gmail environment by adding this project as a
 * Gmail Add-on (the same functions back the homepage card).
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('WebApp')
    .setTitle('Cassy — Personal Assistant')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** State snapshot for the panel. */
function cassyState() {
  const p = PropertiesService.getDocumentProperties();
  const consent = {};
  CASSY.channels.forEach(c => consent[c] = p.getProperty('cassyConsent_' + c) === 'true');
  return {
    lang: Cassy_getLang(),
    langs: CASSY_LANGS,
    tz: CASSY.tz,
    owner: CASSY.owner,
    consent: consent,
    delivery: CASSY.delivery,
    triggers: listCassyTriggers(),
    tagline: Cassy_t('app.tagline')
  };
}

function cassyUiSetLang(code) { return Cassy_setLang(code); }
function cassyUiToggle(channel) { return Cassy_toggleChannel(channel); }
function cassyUiInstall() { return installCassyTriggers(); }
function cassyUiRemove() { return removeCassyTriggers() + ' triggers removed.'; }

/** Run-now buttons. Each is consent-gated inside the routine. */
function cassyUiRun(routine) {
  switch (routine) {
    case 'morningBrief': return cassyMorningBrief();
    case 'inboxTriage':  return JSON.stringify(cassyInboxTriage());
    case 'calendarGuard':return JSON.stringify(cassyCalendarGuard());
    case 'eodWrap':      return cassyEndOfDayWrap();
    case 'weeklyHygiene':return cassyWeeklyHygiene();
    default: throw new Error('Unknown routine: ' + routine);
  }
}

/** Chat/ask handler — routes natural language to existing routines. */
function cassyUiChat(text) {
  const q = (text || '').toLowerCase().trim();
  if (!q || q === 'help' || q === '?') return cassyHelp_();
  if (/morning|brief/.test(q))              return cassyMorningBrief();
  if (/triage|inbox/.test(q))               return JSON.stringify(cassyInboxTriage());
  if (/calendar|guard|conflict/.test(q))    return JSON.stringify(cassyCalendarGuard());
  if (/wrap|eod|end.of.day/.test(q))        return cassyEndOfDayWrap();
  if (/hygiene|crm|weekly/.test(q))         return cassyWeeklyHygiene();
  return cassyHelp_();
}

function cassyHelp_() {
  return 'Cassy can:\n' +
    '• Morning Brief   — daily email + task summary (07:30 GMT)\n' +
    '• Inbox Triage    — label urgent/fyi, draft holding replies\n' +
    '• Calendar Guard  — detect conflicts in next 7 days\n' +
    '• End-of-Day Wrap — summary of what Cassy did today (18:30 GMT)\n' +
    '• Weekly Hygiene  — stale deals + CRM nudges (Mon 08:00 GMT)\n\n' +
    'Type any keyword above, or use the Run buttons.\n' +
    'Example: "morning brief", "inbox", "calendar", "wrap", "hygiene"';
}
