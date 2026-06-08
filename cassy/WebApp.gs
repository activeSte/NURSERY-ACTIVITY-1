/**
 * Cassy — Web App entry + control-panel backend (v2).
 * Deploy: Apps Script editor → Deploy → New deployment → Web app
 *         (Execute as: me · Access: only myself)
 *
 * Exposes:
 *   - 5 routines (run-now buttons)
 *   - Gemini runbook generator + BMS diagnostics  (Gemini.gs)
 *   - Ask Cassy chat (keyword routing + free Gemini answers)
 *   - Antigravity IDE bridge (AntigravityIDE.gs)
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
    lang:     Cassy_getLang(),
    langs:    CASSY_LANGS,
    tz:       CASSY.tz,
    owner:    CASSY.owner,
    consent:  consent,
    delivery: CASSY.delivery,
    triggers: listCassyTriggers(),
    tagline:  Cassy_t('app.tagline'),
    antigravity: Cassy_antigravityEnabled_()
  };
}

/* ---- Core UI wires ---- */
function cassyUiSetLang(code)    { return Cassy_setLang(code); }
function cassyUiToggle(channel)  { return Cassy_toggleChannel(channel); }
function cassyUiInstall()        { return installCassyTriggers(); }
function cassyUiRemove()         { return removeCassyTriggers() + ' triggers removed.'; }

/* ---- Run-now buttons ---- */
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

/* ---- Gemini features (v2) ---- */
function cassyUiRunbook(helpText, timezone, deliveryMethod) {
  return cassyGenerateRunbook(helpText, timezone, deliveryMethod);
}
function cassyUiDiagnostics() { return cassyDiagnostics(); }

/* ---- Antigravity IDE bridge ---- */
function cassyUiAntigravityCheckin() { return cassyAntigravityCheckin(); }
function cassyUiAntigravitySend(subject, body, toAgent) {
  return cassyAntigravitySend(subject, body, toAgent);
}
function cassyUiAntigravitySetup() { return cassyAntigravitySetup(); }

/* ---- Ask Cassy chat ---- */
function cassyUiChat(text) {
  const q = (text || '').toLowerCase().trim();
  if (!q || q === 'help' || q === '?')              return cassyHelp_();
  if (/morning|brief/.test(q))                      return cassyMorningBrief();
  if (/triage|inbox/.test(q))                       return JSON.stringify(cassyInboxTriage());
  if (/calendar|guard|conflict/.test(q))            return JSON.stringify(cassyCalendarGuard());
  if (/wrap|eod|end.of.day/.test(q))                return cassyEndOfDayWrap();
  if (/hygiene|crm|weekly/.test(q))                 return cassyWeeklyHygiene();
  if (/runbook|schedule|plan/.test(q))              return cassyGenerateRunbook(q, CASSY.tz, 'Gmail digest');
  if (/diagnost|status|health|kpi|pmat/.test(q))    return JSON.stringify(cassyDiagnostics(), null, 2);
  if (/antigravit|coordinat|ide|hub/.test(q))       return JSON.stringify(cassyAntigravityCheckin(), null, 2);
  // Free-text: let Gemini answer if configured
  if (Cassy_geminiEnabled_()) {
    const sys = 'You are Cassy, an ethics-first personal assistant for ' + CASSY.owner +
                '. Answer briefly and helpfully. Language: ' + Cassy_getLang() + '.';
    const out = Cassy_gemini_(q, sys, null);
    if (out) return out.trim();
  }
  return cassyHelp_();
}

function cassyHelp_() {
  return 'Cassy can:\n' +
    '• Morning Brief      — daily email + task summary (07:30 GMT)\n' +
    '• Inbox Triage       — label urgent/fyi, Gemini draft replies\n' +
    '• Calendar Guard     — detect conflicts in next 7 days\n' +
    '• End-of-Day Wrap    — summary of what Cassy did today (18:30 GMT)\n' +
    '• Weekly Hygiene     — stale deals + CRM nudges (Mon 08:00 GMT)\n' +
    '• Runbook <goals>    — Gemini generates your custom schedule\n' +
    '• Status / Diagnostics — KPIs + PMAT agent map\n' +
    '• Antigravity / Hub  — check tasks from the Coordinators Team\n\n' +
    'With a Gemini key set, any free-text question is answered directly.';
}
