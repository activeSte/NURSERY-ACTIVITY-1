/**
 * Cassy — time-driven triggers ("the recurring basis").
 *
 * GAS triggers fire in the SCRIPT's timezone (set in appsscript.json to
 * Etc/GMT == GMT+0). Run installCassyTriggers() once from the Apps Script
 * editor or the Web App "Install" button. Re-running is safe: it clears
 * Cassy's own triggers first (idempotent).
 *
 * Schedule (per RUNBOOK.md):
 *   07:30  daily   cassyMorningBrief
 *   09–18  hourly  cassyInboxTriage + cassyCalendarGuard (quiet-hours aware)
 *   18:30  daily   cassyEndOfDayWrap
 *   Mon 08 weekly  cassyWeeklyHygiene
 */

const CASSY_TRIGGER_FNS = [
  'cassyMorningBrief',
  'cassyInboxTriage',
  'cassyCalendarGuard',
  'cassyEndOfDayWrap',
  'cassyWeeklyHygiene'
];

function installCassyTriggers() {
  removeCassyTriggers();

  ScriptApp.newTrigger('cassyMorningBrief')
    .timeBased().everyDays(1).atHour(7).nearMinute(30).create();

  // Hourly routines; the functions themselves skip quiet hours (21–06 GMT).
  ScriptApp.newTrigger('cassyInboxTriage')
    .timeBased().everyHours(1).create();
  ScriptApp.newTrigger('cassyCalendarGuard')
    .timeBased().everyHours(1).create();

  ScriptApp.newTrigger('cassyEndOfDayWrap')
    .timeBased().everyDays(1).atHour(18).nearMinute(30).create();

  ScriptApp.newTrigger('cassyWeeklyHygiene')
    .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();

  audit('cassy.triggers', 'install', CASSY_TRIGGER_FNS.length + ' triggers');
  return 'Installed ' + CASSY_TRIGGER_FNS.length + ' Cassy triggers (GMT).';
}

function removeCassyTriggers() {
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (CASSY_TRIGGER_FNS.indexOf(t.getHandlerFunction()) >= 0) {
      ScriptApp.deleteTrigger(t); n++;
    }
  });
  if (n) audit('cassy.triggers', 'remove', n + ' triggers');
  return n;
}

function listCassyTriggers() {
  return ScriptApp.getProjectTriggers()
    .filter(t => CASSY_TRIGGER_FNS.indexOf(t.getHandlerFunction()) >= 0)
    .map(t => t.getHandlerFunction());
}
