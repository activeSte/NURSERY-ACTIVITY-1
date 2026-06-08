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
    .setXFrameOptions(HtmlService.XFrameOptionsMode.ALLOWALL);
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
