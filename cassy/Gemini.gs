/**
 * Cassy — Gemini bridge + AI features (v2).
 *
 * Adds three BMS-requested capabilities on top of the GAS engine:
 *   1. Gemini-powered DRAFT REPLIES  (Cassy_smartDraftBody_)
 *   2. Gemini-generated RUNBOOK       (cassyGenerateRunbook)
 *   3. BMS DIAGNOSTICS snapshot        (cassyDiagnostics)
 *
 * Ethics: Gemini is OPT-IN. It is only called when a GEMINI_API_KEY is set in
 * Script Properties. With no key, every function falls back to the safe,
 * self-contained behaviour — nothing is ever sent to an external API silently.
 * The email body sent to Gemini is truncated; never auto-sends a reply.
 *
 * Setup (one time): Apps Script → Project Settings → Script Properties →
 *   add  GEMINI_API_KEY = <your key>   (optional GEMINI_MODEL override).
 */

const CASSY_GEMINI = {
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
  defaultModel: 'gemini-2.5-flash'
};

function Cassy_geminiKey_() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
}
function Cassy_geminiModel_() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL') || CASSY_GEMINI.defaultModel;
}
function Cassy_geminiEnabled_() {
  return !!Cassy_geminiKey_();
}

/**
 * Low-level Gemini call. Returns the model text, or null on any failure
 * (so callers can fall back). Optional jsonSchema forces structured output.
 */
function Cassy_gemini_(userPrompt, systemInstruction, jsonSchema) {
  const key = Cassy_geminiKey_();
  if (!key) return null;
  const url = CASSY_GEMINI.endpoint + Cassy_geminiModel_() +
              ':generateContent?key=' + encodeURIComponent(key);

  const payload = { contents: [{ role: 'user', parts: [{ text: userPrompt }] }] };
  if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  if (jsonSchema) {
    payload.generationConfig = { responseMimeType: 'application/json', responseSchema: jsonSchema };
  }

  try {
    const resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const code = resp.getResponseCode();
    if (code !== 200) { audit('cassy.gemini', 'error', 'HTTP ' + code); return null; }
    const data = JSON.parse(resp.getContentText());
    const text = data && data.candidates && data.candidates[0] &&
                 data.candidates[0].content && data.candidates[0].content.parts &&
                 data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    return text || null;
  } catch (e) {
    audit('cassy.gemini', 'error', String(e).slice(0, 120));
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Feature 1 — Gemini-powered draft replies                           */
/* ------------------------------------------------------------------ */

/** Builds a holding-reply body. Uses Gemini if available, else generic. */
function Cassy_smartDraftBody_(thread) {
  const msg = thread.getMessages()[0];
  const generic =
    'Hi,\n\nThanks for your message — Cassy (assistant to ' + CASSY.owner +
    ') has flagged this as time-sensitive and ' + CASSY.owner +
    ' will reply shortly.\n\n— Drafted on behalf, pending review.';

  if (!Cassy_geminiEnabled_()) return generic;

  const lang = Cassy_getLang();
  const sys =
    'You are Cassy, an elegant, ethics-first personal assistant for ' + CASSY.owner + '. ' +
    'Draft a concise, warm, professional HOLDING reply. Do NOT commit to deadlines, ' +
    'prices, or specific promises. Make clear ' + CASSY.owner + ' will personally reply soon. ' +
    'Return ONLY the email body — no subject line, no markdown. Write in language: ' + lang + '.';
  const body = (msg.getPlainBody() || '').slice(0, 1500);
  const prompt = 'Sender: ' + msg.getFrom() + '\nSubject: ' + msg.getSubject() +
                 '\n\nIncoming message:\n' + body + '\n\nWrite the holding reply body.';

  const out = Cassy_gemini_(prompt, sys, null);
  return out ? out.trim() : generic;
}

/* ------------------------------------------------------------------ */
/* Feature 2 — Gemini-generated runbook                               */
/* ------------------------------------------------------------------ */

function cassyGenerateRunbook(helpText, timezone, deliveryMethod) {
  const tz = timezone || CASSY.tz;
  const delivery = deliveryMethod || 'Gmail digest + Sheet log';
  const goals = helpText || 'inbox triage, calendar guard, task tracking, CRM hygiene';
  const lang = Cassy_getLang();

  if (Cassy_geminiEnabled_()) {
    const sys = 'You are Cassy, a timezone-aware ethics-first personal assistant. ' +
      'Produce a structured daily recurring runbook (read-only by default; outbound ' +
      'sends require approval). Write all text in language: ' + lang + '.';
    const schema = {
      type: 'object',
      properties: {
        generatedText: { type: 'string' },
        schedule: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              time:        { type: 'string' },
              activity:    { type: 'string' },
              deliverable: { type: 'string' }
            },
            required: ['time', 'activity', 'deliverable']
          }
        }
      },
      required: ['generatedText', 'schedule']
    };
    const prompt = 'Objectives: "' + goals + '". Timezone: ' + tz +
                   '. Delivery channel: ' + delivery + '. Output the JSON runbook.';
    const out = Cassy_gemini_(prompt, sys, schema);
    if (out) {
      try {
        const parsed = JSON.parse(out);
        audit('cassy.runbook', 'gemini', (parsed.schedule || []).length + ' steps');
        return Cassy_formatRunbook_(parsed, tz, delivery);
      } catch (e) { /* fall through to static */ }
    }
  }
  audit('cassy.runbook', 'static', 'fallback');
  return Cassy_staticRunbook_(goals, tz, delivery);
}

function Cassy_formatRunbook_(parsed, tz, delivery) {
  const lines = ['# Cassy Operational Runbook (' + tz + ')', ''];
  if (parsed.generatedText) { lines.push(parsed.generatedText, ''); }
  lines.push('| Time | Activity | Deliverable |', '|---|---|---|');
  (parsed.schedule || []).forEach(s =>
    lines.push('| ' + (s.time || '') + ' | ' + (s.activity || '') + ' | ' + (s.deliverable || '') + ' |'));
  lines.push('', 'Delivery: ' + delivery + ' · read-only by default · PEC never auto-actioned.');
  return lines.join('\n');
}

function Cassy_staticRunbook_(goals, tz, delivery) {
  return [
    '# Cassy Operational Runbook (' + tz + ')',
    '',
    'Cassy will recurringly handle: ' + goals + '.',
    '(Gemini not configured — showing the default fixed schedule.)',
    '',
    '| Time | Activity | Deliverable |',
    '|---|---|---|',
    '| 07:30 | Morning Brief — unread + calendar + tasks | Gmail digest + Sheet |',
    '| 09–18 | Inbox Triage — label urgent/fyi, draft replies | Drafts (pending approval) |',
    '| 09–18 | Calendar Guard — detect 7-day conflicts | Alert on conflict |',
    '| 18:30 | End-of-Day Wrap — what Cassy did today | Gmail digest + Sheet |',
    '| Mon 08:00 | Weekly Hygiene — stale deals + CRM | Digest (+ Notion) |',
    '',
    'Delivery: ' + delivery + ' · read-only by default · PEC never auto-actioned.'
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Feature 3 — BMS diagnostics snapshot                               */
/* ------------------------------------------------------------------ */

function cassyDiagnostics() {
  const props = PropertiesService.getDocumentProperties();
  const consent = {};
  CASSY.channels.forEach(c => consent[c] = props.getProperty('cassyConsent_' + c) === 'true');
  const active = Object.keys(consent).filter(c => consent[c]).length;
  const triggers = listCassyTriggers();

  const today = Utilities.formatDate(new Date(), CASSY.tz, 'yyyy-MM-dd');
  let actionsToday = 0;
  const sh = SpreadsheetApp.getActive().getSheetByName(TABS.audit);
  if (sh) {
    const rows = sh.getDataRange().getValues();
    actionsToday = rows.slice(1).filter(r =>
      String(r[2]).indexOf('cassy.') === 0 &&
      Utilities.formatDate(new Date(r[0]), CASSY.tz, 'yyyy-MM-dd') === today).length;
  }

  return {
    kpis: {
      activeChannels: active + '/' + CASSY.channels.length,
      triggers: triggers.length,
      actionsToday: actionsToday,
      gemini: Cassy_geminiEnabled_() ? 'LIVE · ' + Cassy_geminiModel_() : 'SIMULATED (no key)',
      tz: CASSY.tz,
      lang: Cassy_getLang()
    },
    pmat: [
      { name: 'Coordinator (LCAI)',   role: 'Dispatcher',          status: triggers.length ? 'armed' : 'idle' },
      { name: 'Email Agent',          role: 'Triage + draft',      status: consent.gmail    ? 'ready' : 'off' },
      { name: 'Calendar+Tasks Agent', role: 'Guard + due tasks',   status: consent.calendar ? 'ready' : 'off' },
      { name: 'Docs+Notes Agent',     role: 'Drive + Notion',      status: consent.drive    ? 'ready' : 'off' },
      { name: 'CRM+i18n Agent',       role: 'Contacts + language', status: consent.contacts ? 'ready' : 'off' },
      { name: 'Checker Agent',        role: 'Ethics + audit gate', status: 'active' }
    ],
    grafcet: ['S0 idle', 'S1 consent', 'S2 rate-limit', 'S3 read', 'S4 act', 'S5 deliver+audit']
  };
}
