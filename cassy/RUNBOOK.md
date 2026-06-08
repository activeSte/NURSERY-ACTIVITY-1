# CASSY — One-Page Runbook (v1)

**Owner:** BMS (S1.PINATO@gmail.com) · **Timezone:** GMT+0 · **Language:** English (ruler: EN/IT/DE/ZH/JA/FR/HI)
**Quest:** #QCRAFT-CONDCHECKRUT · 20260608-GMT0-h09.50-1
**Posture:** read-only by default · every action audited · outbound/external/delete require approval · PEC never auto-actioned.

---

## What Cassy does, and when

| When (GMT) | Routine | Reads | Acts | Update |
|---|---|---|---|---|
| **07:30 daily** | **Morning Brief** | Gmail unread, Calendar today, Tasks due | Summarize, flag urgent, list "reply today" | Digest → email + sheet (+ optional calendar) |
| **Hourly 09–18** | **Inbox Triage** | New Gmail (last 24h) | Label `Cassy/Urgent` · `Cassy/FYI`; **draft** holding replies for approval | Silent; counted in next digest |
| **Hourly 09–18** | **Calendar Guard** | Calendar (next 7d) | Detect overlaps; (future) propose slots & draft invites | Alert only on conflict |
| **18:30 daily** | **End-of-Day Wrap** | Today's AuditLog | Summarize what Cassy did; flag rollovers | Digest → email + sheet |
| **Mon 08:00 weekly** | **CRM & Notes Hygiene** | Deals, Contacts, Drive, Notion | Stale-deal nudges; file loose docs; weekly note | Digest (+ Notion "Cassy Daily") |
| **On-demand** | **Ask Cassy / Run-now** | Any consented source | Run any routine from the Web App | Inline output |

## Update delivery (all options available, toggle per channel)
- **Gmail digest** to self (`[Cassy] …`) — safe, never sent to third parties automatically.
- **Sheet log** tab `CassyBriefs` (always-on archive).
- **Calendar** all-day brief (optional).
- **Notion** "Cassy Daily" page (weekly hygiene / knowledge capture).
- **Inline** in the Web App / Gmail Add-on panel.

## Consent & guardrails
- Per-channel consent toggles (gmail, calendar, drive, tasks, contacts) — **default OFF**; flip them in the Cassy panel.
- Rate-limited (inherits `crm/Ethics.gs`: gmail.read 60/min, tasks.write 30/min).
- PII redacted in all logs; every action appended to the `AuditLog` tab.
- **Hard stops:** no outbound send / external invite / delete without explicit approval; **Aruba PEC is read-only + manual-confirm only.**

## Channels — reality
✅ **Live:** Gmail · Google Calendar · Google Drive · Google Tasks · Google Contacts · Notion (notes).
❌ **No connector here:** Libero · Yahoo · AOL · Aruba Webmail · Aruba PEC → use the documented IMAP/SMTP bridge (opt-in) or forward-into-Gmail.

## Operate
1. Cassy panel → flip the channels you consent to **ON**.
2. Click a **Run-now** button to test a routine.
3. Click **Install triggers** to start the recurring schedule (GMT).
4. Change **Lang** any time; digests re-render in that language.
5. Pause anytime: **Remove triggers**, or revoke at <https://myaccount.google.com/permissions>.
