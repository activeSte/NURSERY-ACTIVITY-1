/**
 * Cassy — Gmail Add-on (CardService UI).
 *
 * Deploys as a Gmail sidebar panel.  Two entry points:
 *   cassyGmailHomepage()   — homepage card (always shown in the Cassy panel)
 *   cassyGmailContextual() — contextual card (shown when you open an email)
 *
 * Deploy: Apps Script editor → Deploy → New deployment → type: Add-on
 * Then in the Manage deployments dialog click "Install" to side-load it into your Gmail.
 */

const ADDON_IMG_ = 'https://drive.google.com/thumbnail?id=1uUBFwImGEeqNDGF_bUF7WXJQIFvppNMB&sz=w240';

/* ── Entry points ── */

function cassyGmailHomepage() {
  return [buildCassyCard_()];
}

function cassyGmailContextual(e) {
  return [buildCassyCard_(e)];
}

/* ── Card builder ── */

function buildCassyCard_(e) {
  const card = CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Cassy')
        .setSubtitle('Ethics-first personal assistant')
        .setImageUrl(ADDON_IMG_)
        .setImageStyle(CardService.ImageStyle.CIRCLE)
    );

  /* ── 1. Routines ── */
  const routineSection = CardService.newCardSection().setHeader('Routines');

  routineSection.addWidget(
    CardService.newButtonSet()
      .addButton(btn_('Morning Brief',   'cassyAddonMorningBrief'))
      .addButton(btn_('Inbox Triage',    'cassyAddonInboxTriage'))
  );
  routineSection.addWidget(
    CardService.newButtonSet()
      .addButton(btn_('Calendar Guard',  'cassyAddonCalendarGuard'))
      .addButton(btn_('End-of-Day Wrap', 'cassyAddonEodWrap'))
  );
  routineSection.addWidget(
    btn_('Weekly Hygiene', 'cassyAddonWeeklyHygiene')
  );
  card.addSection(routineSection);

  /* ── 2. Contextual — current email thread ── */
  if (e && e.gmail && e.gmail.messageId) {
    const threadSection = CardService.newCardSection().setHeader('This email');

    threadSection.addWidget(
      CardService.newTextButton()
        .setText('Draft holding reply')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('cassyAddonDraftReply')
            .setParameters({ messageId: e.gmail.messageId })
        )
    );
    threadSection.addWidget(
      CardService.newTextButton()
        .setText('Label as Urgent')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('cassyAddonLabelUrgent')
            .setParameters({ messageId: e.gmail.messageId })
        )
    );
    card.addSection(threadSection);
  }

  /* ── 3. Ask Cassy chat ── */
  const chatSection = CardService.newCardSection().setHeader('Ask Cassy');
  chatSection.addWidget(
    CardService.newTextInput()
      .setFieldName('cassyQuestion')
      .setTitle('Question')
      .setHint('morning brief · triage · status · help …')
  );
  chatSection.addWidget(
    CardService.newTextButton()
      .setText('Ask')
      .setOnClickAction(CardService.newAction().setFunctionName('cassyAddonChat'))
  );
  card.addSection(chatSection);

  /* ── 4. Status pill ── */
  const statusSection = CardService.newCardSection();
  const lang  = Cassy_getLang ? Cassy_getLang() : 'EN';
  const trigs = listCassyTriggers ? listCassyTriggers() : [];
  statusSection.addWidget(
    CardService.newKeyValue()
      .setTopLabel('Triggers')
      .setContent(trigs.length ? trigs.length + ' active' : 'none — use Install triggers in Web App')
  );
  statusSection.addWidget(
    CardService.newKeyValue()
      .setTopLabel('Language')
      .setContent(lang)
  );
  card.addSection(statusSection);

  return card.build();
}

/* ── Helpers ── */

function btn_(label, fn) {
  return CardService.newTextButton()
    .setText(label)
    .setOnClickAction(CardService.newAction().setFunctionName(fn));
}

function toast_(text) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(text.slice(0, 100)))
    .build();
}

/* ── Routine action handlers ── */

function cassyAddonMorningBrief() {
  try { cassyMorningBrief(); return toast_('Morning Brief sent.'); }
  catch(ex) { return toast_('Error: ' + ex.message); }
}

function cassyAddonInboxTriage() {
  try {
    const r = cassyInboxTriage();
    const n = Array.isArray(r) ? r.length : '?';
    return toast_('Inbox Triage done — ' + n + ' threads processed.');
  } catch(ex) { return toast_('Error: ' + ex.message); }
}

function cassyAddonCalendarGuard() {
  try { cassyCalendarGuard(); return toast_('Calendar Guard complete.'); }
  catch(ex) { return toast_('Error: ' + ex.message); }
}

function cassyAddonEodWrap() {
  try { cassyEndOfDayWrap(); return toast_('End-of-Day Wrap sent.'); }
  catch(ex) { return toast_('Error: ' + ex.message); }
}

function cassyAddonWeeklyHygiene() {
  try { cassyWeeklyHygiene(); return toast_('Weekly Hygiene done.'); }
  catch(ex) { return toast_('Error: ' + ex.message); }
}

/* ── Contextual handlers ── */

function cassyAddonDraftReply(e) {
  try {
    const msg    = GmailApp.getMessageById(e.parameters.messageId);
    const thread = msg.getThread();
    const body   = Cassy_smartDraftBody_ ? Cassy_smartDraftBody_(thread)
                   : 'Thank you for your message. I will follow up shortly.\n\nBest regards';
    msg.createDraftReply(body);
    return toast_('Draft reply created — check Gmail Drafts.');
  } catch(ex) { return toast_('Error: ' + ex.message); }
}

function cassyAddonLabelUrgent(e) {
  try {
    const msg = GmailApp.getMessageById(e.parameters.messageId);
    Cassy_ensureLabel_(CASSY.labels.urgent);
    GmailApp.getUserLabelByName(CASSY.labels.urgent).addToThread(msg.getThread());
    audit('cassy.gmail_addon', 'label_urgent', msg.getThread().getFirstMessageSubject());
    return toast_('Labelled Cassy/Urgent.');
  } catch(ex) { return toast_('Error: ' + ex.message); }
}

/* ── Ask Cassy chat ── */

function cassyAddonChat(e) {
  try {
    const q = (e.formInput && e.formInput.cassyQuestion) || '';
    if (!q) return toast_('Type a question first.');
    const answer = cassyUiChat(q);
    // Show first 100 chars as toast; full answer goes to Output log in the Web App
    return toast_(answer ? answer : 'Done.');
  } catch(ex) { return toast_('Error: ' + ex.message); }
}
