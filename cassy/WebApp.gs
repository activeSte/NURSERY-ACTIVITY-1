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

/** v2 — Gemini runbook generator (panel form). */
function cassyUiRunbook(helpText, timezone, deliveryMethod) {
  return cassyGenerateRunbook(helpText, timezone, deliveryMethod);
}

/** v2 — BMS diagnostics snapshot (panel + chat). */
function cassyUiDiagnostics() { return cassyDiagnostics(); }

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
  if (/runbook|schedule|plan/.test(q))      return cassyGenerateRunbook(q, CASSY.tz, 'Gmail digest + Sheet log');
  if (/diagnost|status|health|kpi|pmat/.test(q)) return JSON.stringify(cassyDiagnostics(), null, 2);
  // Anything else → let Gemini answer directly if configured.
  if (Cassy_geminiEnabled_()) {
    const sys = 'You are Cassy, an ethics-first personal assistant for ' + CASSY.owner +
                '. Answer briefly and helpfully in language: ' + Cassy_getLang() + '.';
    const out = Cassy_gemini_(q, sys, null);
    if (out) return out.trim();
  }
  return cassyHelp_();
}

function cassyHelp_() {
  return 'Cassy can:\n' +
    '• Morning Brief   — daily email + task summary (07:30 GMT)\n' +
    '• Inbox Triage    — label urgent/fyi, Gemini draft replies\n' +
    '• Calendar Guard  — detect conflicts in next 7 days\n' +
    '• End-of-Day Wrap — summary of what Cassy did today (18:30 GMT)\n' +
    '• Weekly Hygiene  — stale deals + CRM nudges (Mon 08:00 GMT)\n' +
    '• Runbook         — type "runbook <your goals>" → Gemini schedule\n' +
    '• Diagnostics     — type "status" → KPIs + PMAT agent map\n\n' +
    'With a Gemini key set, free-text questions are answered directly.';
}
