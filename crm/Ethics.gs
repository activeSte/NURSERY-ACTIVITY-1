/**
 * Ethics — guards every Gmail / Tasks / external call.
 * "Fair and square": no read without consent, no spam, no PII in subjects.
 */
const Ethics = (function () {

  const RATE_LIMITS = { 'gmail.read': 60, 'tasks.write': 30 };   // per minute

  function assertConsent() {
    const ok = PropertiesService.getDocumentProperties().getProperty('gmailConsent') === 'true';
    if (!ok) {
      throw new Error(
        'Gmail consent is OFF. Open CRM → Toggle Gmail consent to enable.'
      );
    }
  }

  function withinRateLimit(key) {
    const cache = CacheService.getDocumentCache();
    const bucket = 'rl_' + key + '_' + Math.floor(Date.now() / 60000);
    const n = Number(cache.get(bucket) || 0) + 1;
    cache.put(bucket, String(n), 90);
    const max = RATE_LIMITS[key] || 60;
    if (n > max) throw new Error('Rate limit exceeded for ' + key + ' (' + n + '/' + max + ')');
  }

  /** Strip emails / phone-looking strings before logging. */
  function redactPII(text) {
    if (!text) return text;
    return String(text)
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
      .replace(/\+?\d[\d\s().-]{6,}\d/g, '<phone>');
  }

  return { assertConsent, withinRateLimit, redactPII };
})();
