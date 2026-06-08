/**
 * Cassy — i18n language ruler.
 * Default: EN. Selectable: EN, IT, DE, ZH, JA, FR, HI.
 *
 * Usage:  Cassy_t('brief.title')        -> string in current LANG
 *         Cassy_t('brief.title', 'IT')  -> force a language
 *
 * The active language is stored in Document Properties under 'cassyLang'
 * and can be changed from the Web App header or Cassy_setLang('IT').
 */

const CASSY_LANGS = ['EN', 'IT', 'DE', 'ZH', 'JA', 'FR', 'HI'];
const CASSY_DEFAULT_LANG = 'EN';

const CASSY_STRINGS = {
  EN: {
    'app.name': 'Cassy',
    'app.tagline': 'Your ethics-first personal assistant',
    'brief.title': 'Morning Brief',
    'brief.unread': 'Unread emails',
    'brief.today': 'On your calendar today',
    'brief.due': 'Tasks due',
    'brief.replyToday': 'Suggested replies for today',
    'brief.none': 'Nothing here — you are all clear.',
    'wrap.title': 'End-of-Day Wrap',
    'wrap.actions': 'What Cassy did today',
    'wrap.rollover': 'Rolled over to tomorrow',
    'triage.urgent': 'Urgent',
    'triage.fyi': 'FYI',
    'guard.conflict': 'Calendar conflict detected',
    'hygiene.title': 'Weekly CRM & Notes Hygiene',
    'hygiene.stale': 'Stale deals needing a nudge',
    'consent.off': 'Consent is OFF for this channel. Enable it in the Cassy panel.',
    'digest.footer': 'Delivered by Cassy · read-only by default · reply STOP to pause.'
  },
  IT: {
    'app.name': 'Cassy',
    'app.tagline': 'Il tuo assistente personale, prima di tutto etico',
    'brief.title': 'Riepilogo del Mattino',
    'brief.unread': 'Email non lette',
    'brief.today': 'Oggi in calendario',
    'brief.due': 'Attività in scadenza',
    'brief.replyToday': 'Risposte suggerite per oggi',
    'brief.none': 'Niente qui — sei a posto.',
    'wrap.title': 'Resoconto di Fine Giornata',
    'wrap.actions': 'Cosa ha fatto Cassy oggi',
    'wrap.rollover': 'Rinviato a domani',
    'triage.urgent': 'Urgente',
    'triage.fyi': 'Per conoscenza',
    'guard.conflict': 'Rilevato conflitto in calendario',
    'hygiene.title': 'Igiene settimanale CRM e Note',
    'hygiene.stale': 'Trattative ferme da sollecitare',
    'consent.off': 'Consenso DISATTIVO per questo canale. Attivalo nel pannello Cassy.',
    'digest.footer': 'Inviato da Cassy · sola lettura per impostazione · rispondi STOP per mettere in pausa.'
  },
  DE: {
    'app.name': 'Cassy',
    'app.tagline': 'Dein ethik-orientierter persönlicher Assistent',
    'brief.title': 'Morgen-Briefing',
    'brief.unread': 'Ungelesene E-Mails',
    'brief.today': 'Heute im Kalender',
    'brief.due': 'Fällige Aufgaben',
    'brief.replyToday': 'Vorgeschlagene Antworten für heute',
    'brief.none': 'Nichts hier — alles erledigt.',
    'wrap.title': 'Tagesabschluss',
    'wrap.actions': 'Was Cassy heute getan hat',
    'wrap.rollover': 'Auf morgen verschoben',
    'triage.urgent': 'Dringend',
    'triage.fyi': 'Zur Info',
    'guard.conflict': 'Kalenderkonflikt erkannt',
    'hygiene.title': 'Wöchentliche CRM- und Notizenpflege',
    'hygiene.stale': 'Liegengebliebene Deals',
    'consent.off': 'Zustimmung AUS für diesen Kanal. Im Cassy-Panel aktivieren.',
    'digest.footer': 'Gesendet von Cassy · standardmäßig nur lesend · STOP zum Pausieren.'
  },
  ZH: {
    'app.name': 'Cassy',
    'app.tagline': '以道德为先的个人助理',
    'brief.title': '早间简报',
    'brief.unread': '未读邮件',
    'brief.today': '今天的日程',
    'brief.due': '到期任务',
    'brief.replyToday': '今日建议回复',
    'brief.none': '这里什么都没有 — 一切就绪。',
    'wrap.title': '每日收尾',
    'wrap.actions': 'Cassy 今天做了什么',
    'wrap.rollover': '顺延到明天',
    'triage.urgent': '紧急',
    'triage.fyi': '供参考',
    'guard.conflict': '检测到日程冲突',
    'hygiene.title': '每周 CRM 与笔记整理',
    'hygiene.stale': '需要跟进的停滞交易',
    'consent.off': '此渠道的授权已关闭。请在 Cassy 面板中启用。',
    'digest.footer': '由 Cassy 发送 · 默认只读 · 回复 STOP 暂停。'
  },
  JA: {
    'app.name': 'Cassy',
    'app.tagline': '倫理を最優先するパーソナルアシスタント',
    'brief.title': '朝のブリーフィング',
    'brief.unread': '未読メール',
    'brief.today': '本日の予定',
    'brief.due': '期限のタスク',
    'brief.replyToday': '本日の返信候補',
    'brief.none': 'ここには何もありません — 問題なしです。',
    'wrap.title': '一日のまとめ',
    'wrap.actions': '本日 Cassy が行ったこと',
    'wrap.rollover': '明日へ繰り越し',
    'triage.urgent': '緊急',
    'triage.fyi': '参考',
    'guard.conflict': 'カレンダーの競合を検出',
    'hygiene.title': '週次 CRM・ノート整理',
    'hygiene.stale': 'フォローが必要な停滞案件',
    'consent.off': 'このチャネルの同意はオフです。Cassy パネルで有効にしてください。',
    'digest.footer': 'Cassy が送信 · 既定は読み取り専用 · STOP で一時停止。'
  },
  FR: {
    'app.name': 'Cassy',
    'app.tagline': 'Votre assistant personnel, éthique avant tout',
    'brief.title': 'Briefing du Matin',
    'brief.unread': 'E-mails non lus',
    'brief.today': "Aujourd'hui dans l'agenda",
    'brief.due': 'Tâches à échéance',
    'brief.replyToday': 'Réponses suggérées pour aujourd’hui',
    'brief.none': 'Rien ici — tout est en ordre.',
    'wrap.title': 'Bilan de Fin de Journée',
    'wrap.actions': "Ce que Cassy a fait aujourd'hui",
    'wrap.rollover': 'Reporté à demain',
    'triage.urgent': 'Urgent',
    'triage.fyi': 'Pour information',
    'guard.conflict': "Conflit d'agenda détecté",
    'hygiene.title': 'Entretien hebdomadaire CRM et Notes',
    'hygiene.stale': 'Affaires en attente à relancer',
    'consent.off': 'Consentement DÉSACTIVÉ pour ce canal. Activez-le dans le panneau Cassy.',
    'digest.footer': 'Envoyé par Cassy · lecture seule par défaut · répondez STOP pour suspendre.'
  },
  HI: {
    'app.name': 'Cassy',
    'app.tagline': 'नैतिकता-प्रथम निजी सहायक',
    'brief.title': 'प्रातः ब्रीफिंग',
    'brief.unread': 'अपठित ईमेल',
    'brief.today': 'आज कैलेंडर में',
    'brief.due': 'देय कार्य',
    'brief.replyToday': 'आज के लिए सुझाए गए उत्तर',
    'brief.none': 'यहाँ कुछ नहीं — आप पूरी तरह मुक्त हैं।',
    'wrap.title': 'दिन-समाप्ति सारांश',
    'wrap.actions': 'Cassy ने आज क्या किया',
    'wrap.rollover': 'कल के लिए स्थानांतरित',
    'triage.urgent': 'अत्यावश्यक',
    'triage.fyi': 'सूचनार्थ',
    'guard.conflict': 'कैलेंडर टकराव पाया गया',
    'hygiene.title': 'साप्ताहिक CRM और नोट्स रखरखाव',
    'hygiene.stale': 'रुके हुए सौदे जिन्हें याद दिलाना है',
    'consent.off': 'इस चैनल के लिए सहमति बंद है। इसे Cassy पैनल में सक्षम करें।',
    'digest.footer': 'Cassy द्वारा भेजा गया · डिफ़ॉल्ट रूप से केवल-पठन · रोकने के लिए STOP लिखें।'
  }
};

/** Get the active language code (Document Property 'cassyLang'), default EN. */
function Cassy_getLang() {
  const v = PropertiesService.getDocumentProperties().getProperty('cassyLang');
  return CASSY_LANGS.indexOf(v) >= 0 ? v : CASSY_DEFAULT_LANG;
}

/** Set the active language; ignores unknown codes and falls back to EN. */
function Cassy_setLang(code) {
  const lang = CASSY_LANGS.indexOf(code) >= 0 ? code : CASSY_DEFAULT_LANG;
  PropertiesService.getDocumentProperties().setProperty('cassyLang', lang);
  return lang;
}

/** Translate a key. Falls back to EN, then to the key itself. */
function Cassy_t(key, lang) {
  const L = lang || Cassy_getLang();
  const table = CASSY_STRINGS[L] || CASSY_STRINGS.EN;
  if (table[key] != null) return table[key];
  if (CASSY_STRINGS.EN[key] != null) return CASSY_STRINGS.EN[key];
  return key;
}
