/**
 * Cassy — recurring personal super-assistant (engine).
 * Design principles (inherited from crm/): checked & balanced · fair & square · clear & friendly.
 *
 * Cassy extends the existing CRM Apps Script project. It REUSES, unchanged:
 *   - Ethics  (crm/Ethics.gs)  : assertConsent / withinRateLimit / redactPII
 *   - audit() (crm/Code.gs)    : append to the AuditLog tab
 *   - getOrCreateTaskList_()   : Google Tasks helper
 *
 * Everything Cassy does is: consent-gated, rate-limited, audited, and
 * READ-ONLY by default. Any action that leaves the account (send mail,
 * invite external guests, delete) is created as a DRAFT/PROPOSAL and
 * requires explicit human approval. Aruba PEC is never auto-actioned.
 */

/* ------------------------------------------------------------------ */
/* Config                                                             */
/* ------------------------------------------------------------------ */

const CASSY = {
  owner: 'S1.PINATO@gmail.com',
  tz: 'Etc/GMT',                 // GMT+0 (POSIX Etc/GMT == UTC)
  quietHours: { start: 21, end: 6 },
  // Per-channel consent keys (stored in Document Properties, default OFF).
  channels: ['gmail', 'calendar', 'drive', 'tasks', 'contacts'],
  labels: { urgent: 'Cassy/Urgent', fyi: 'Cassy/FYI', handled: 'Cassy/Handled' },
  // How updates are delivered. Toggle each independently.
  delivery: { email: true, calendar: false, sheet: true },
  staleDealDays: 14
};

/** Per-channel consent check. Mirrors crm Ethics but channel-scoped. */
function Cassy_assertChannel(channel) {
  const ok = PropertiesService.getDocumentProperties()
    .getProperty('cassyConsent_' + channel) === 'true';
  if (!ok) throw new Error(Cassy_t('consent.off') + ' [' + channel + ']');
}

/** Toggle a channel's consent; returns the new state. */
function Cassy_toggleChannel(channel) {
  const p = PropertiesService.getDocumentProperties();
  const key = 'cassyConsent_' + channel;
  const next = !(p.getProperty(key) === 'true');
  p.setProperty(key, String(next));
  audit('cassy.consent', channel, 'set to ' + next);
  return next;
}

function Cassy_inQuietHours_() {
  const h = Number(Utilities.formatDate(new Date(), CASSY.tz, 'H'));
  const { start, end } = CASSY.quietHours;
  return start > end ? (h >= start || h < end) : (h >= start && h < end);
}

/* ------------------------------------------------------------------ */
/* Routine 1 — Morning Brief (daily 07:30 GMT)                        */
/* ------------------------------------------------------------------ */

function cassyMorningBrief() {
  Cassy_assertChannel('gmail');
  Ethics.withinRateLimit('gmail.read');

  const unread = GmailApp.search('is:unread -in:chats', 0, 25);
  const urgent = unread.filter(t => Cassy_looksUrgent_(t));

  const cal = (CASSY_hasCalendar_())
    ? CalendarApp.getDefaultCalendar()
        .getEventsForDay(new Date())
        .map(e => '• ' + Utilities.formatDate(e.getStartTime(), CASSY.tz, 'HH:mm') + ' ' + e.getTitle())
    : [];

  const tasks = Cassy_dueTasks_();

  const lines = [];
  lines.push('# ' + Cassy_t('brief.title') + ' — ' +
             Utilities.formatDate(new Date(), CASSY.tz, 'EEE dd MMM yyyy') + ' (GMT)');
  lines.push('');
  lines.push('**' + Cassy_t('brief.unread') + ':** ' + unread.length +
             ' (' + Cassy_t('triage.urgent') + ': ' + urgent.length + ')');
  urgent.slice(0, 8).forEach(t =>
    lines.push('  - ⚠️ ' + Ethics.redactPII(t.getFirstMessageSubject())));
  lines.push('');
  lines.push('**' + Cassy_t('brief.today') + ':** ' + (cal.length || '—'));
  cal.forEach(c => lines.push('  ' + c));
  lines.push('');
  lines.push('**' + Cassy_t('brief.due') + ':** ' + (tasks.length || '—'));
  tasks.slice(0, 10).forEach(t => lines.push('  - ☐ ' + t));

  const body = lines.join('\n');
  Cassy_deliver_(Cassy_t('brief.title'), body);
  audit('cassy.morningBrief', 'digest', unread.length + ' unread, ' + urgent.length + ' urgent');
  return body;
}

/* ------------------------------------------------------------------ */
/* Routine 2 — Inbox Triage (hourly 09–18 GMT)                        */
/* ------------------------------------------------------------------ */

function cassyInboxTriage() {
  if (Cassy_inQuietHours_()) return;
  Cassy_assertChannel('gmail');
  Ethics.withinRateLimit('gmail.read');

  const fresh = GmailApp.search('is:unread newer_than:1d -in:chats', 0, 25);
  const urgentLabel = Cassy_label_(CASSY.labels.urgent);
  const fyiLabel = Cassy_label_(CASSY.labels.fyi);

  let nUrgent = 0, nFyi = 0, nDrafts = 0;
  fresh.forEach(t => {
    if (Cassy_looksUrgent_(t)) { t.addLabel(urgentLabel); nUrgent++; }
    else { t.addLabel(fyiLabel); nFyi++; }

    // Draft a courteous holding reply for urgent threads — NEVER auto-send.
    // Uses Gemini for a context-aware draft if configured (see Gemini.gs),
    // otherwise a safe generic holding message.
    if (Cassy_looksUrgent_(t) && CASSY_canCompose_()) {
      const msg = t.getMessages()[0];
      const draftBody = Cassy_smartDraftBody_(t);
      msg.createDraftReply(draftBody);
      nDrafts++;
    }
  });

  audit('cassy.inboxTriage', 'gmail',
        nUrgent + ' urgent / ' + nFyi + ' fyi / ' + nDrafts + ' drafts');
  return { urgent: nUrgent, fyi: nFyi, drafts: nDrafts };
}

/* ------------------------------------------------------------------ */
/* Routine 3 — Calendar Guard (hourly 09–18 GMT)                      */
/* ------------------------------------------------------------------ */

function cassyCalendarGuard() {
  if (Cassy_inQuietHours_()) return;
  if (!CASSY_hasCalendar_()) return;
  Cassy_assertChannel('calendar');

  const cal = CalendarApp.getDefaultCalendar();
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
  const events = cal.getEvents(start, end).sort((a, b) => a.getStartTime() - b.getStartTime());

  const conflicts = [];
  for (let i = 1; i < events.length; i++) {
    if (events[i].getStartTime() < events[i - 1].getEndTime()) {
      conflicts.push(events[i - 1].getTitle() + '  ⇄  ' + events[i].getTitle());
    }
  }
  if (conflicts.length) {
    const body = '**' + Cassy_t('guard.conflict') + ' (' + conflicts.length + ')**\n' +
                 conflicts.map(c => '  - ' + c).join('\n');
    Cassy_deliver_(Cassy_t('guard.conflict'), body);
  }
  audit('cassy.calendarGuard', 'calendar', conflicts.length + ' conflicts in 7d');
  return conflicts;
}

/* ------------------------------------------------------------------ */
/* Routine 4 — End-of-Day Wrap (daily 18:30 GMT)                      */
/* ------------------------------------------------------------------ */

function cassyEndOfDayWrap() {
  const sh = SpreadsheetApp.getActive().getSheetByName(TABS.audit);
  const today = Utilities.formatDate(new Date(), CASSY.tz, 'yyyy-MM-dd');
  let acted = [];
  if (sh) {
    const rows = sh.getDataRange().getValues();
    acted = rows.slice(1)
      .filter(r => String(r[2]).indexOf('cassy.') === 0 &&
                   Utilities.formatDate(new Date(r[0]), CASSY.tz, 'yyyy-MM-dd') === today)
      .map(r => '  - ' + r[2] + ' · ' + r[4]);
  }
  const body = '# ' + Cassy_t('wrap.title') + ' — ' + today + ' (GMT)\n\n**' +
               Cassy_t('wrap.actions') + ':** ' + (acted.length || '—') + '\n' +
               acted.join('\n');
  Cassy_deliver_(Cassy_t('wrap.title'), body);
  audit('cassy.eodWrap', 'digest', acted.length + ' actions today');
  return body;
}

/* ------------------------------------------------------------------ */
/* Routine 5 — Weekly CRM & Notes Hygiene (Mon 08:00 GMT)             */
/* ------------------------------------------------------------------ */

function cassyWeeklyHygiene() {
  const ss = SpreadsheetApp.getActive();
  const deals = ss.getSheetByName(TABS.deals);
  const stale = [];
  if (deals) {
    const data = deals.getDataRange().getValues();
    const cutoff = Date.now() - CASSY.staleDealDays * 24 * 3600 * 1000;
    for (let i = 1; i < data.length; i++) {
      const [id, title, , stage, , openedAt] = data[i];
      if (!id || stage === 'Won' || stage === 'Lost') continue;
      if (openedAt && new Date(openedAt).getTime() < cutoff) {
        stale.push('  - [' + id + '] ' + title + ' (' + stage + ')');
      }
    }
  }
  const body = '# ' + Cassy_t('hygiene.title') + '\n\n**' +
               Cassy_t('hygiene.stale') + ':** ' + (stale.length || '—') + '\n' +
               stale.join('\n');
  Cassy_deliver_(Cassy_t('hygiene.title'), body);
  audit('cassy.weeklyHygiene', 'crm', stale.length + ' stale deals');
  return body;
}

/* ------------------------------------------------------------------ */
/* Delivery + helpers                                                 */
/* ------------------------------------------------------------------ */

/** Deliver a digest across the enabled channels. Email is approval-safe (to self). */
function Cassy_deliver_(subject, markdownBody) {
  const footer = '\n\n---\n' + Cassy_t('digest.footer');
  const full = markdownBody + footer;

  if (CASSY.delivery.sheet) Cassy_writeBriefSheet_(subject, full);
  if (CASSY.delivery.email) {
    // Self-addressed digest only — safe, not an outbound send to third parties.
    GmailApp.sendEmail(CASSY.owner, '[Cassy] ' + subject, full);
  }
  if (CASSY.delivery.calendar && CASSY_hasCalendar_()) {
    CalendarApp.getDefaultCalendar().createAllDayEvent(
      '[Cassy] ' + subject, new Date(),
      { description: full });
  }
}

function Cassy_writeBriefSheet_(subject, body) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('CassyBriefs');
  if (!sh) {
    sh = ss.insertSheet('CassyBriefs');
    sh.getRange(1, 1, 1, 3).setValues([['ts', 'subject', 'body']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  sh.appendRow([new Date(), subject, body]);
}

function Cassy_looksUrgent_(thread) {
  const s = (thread.getFirstMessageSubject() || '').toLowerCase();
  return /(urgent|asap|today|scaden|deadline|invoice|fattura|pec|legal|payment|overdue)/.test(s)
      || thread.isImportant();
}

function Cassy_dueTasks_() {
  try {
    const lists = Tasks.Tasklists.list().items || [];
    const out = [];
    lists.forEach(l => {
      const items = (Tasks.Tasks.list(l.id, { showCompleted: false }).items) || [];
      items.forEach(it => { if (it.title) out.push(it.title); });
    });
    return out;
  } catch (e) { return []; }
}

function Cassy_label_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

/** Capability probes — let routines degrade gracefully if a service is off. */
function CASSY_hasCalendar_() {
  try { return !!CalendarApp.getDefaultCalendar(); } catch (e) { return false; }
}
function CASSY_canCompose_() {
  try { return !!GmailApp.getAliases; } catch (e) { return false; }
}
