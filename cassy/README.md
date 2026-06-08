# Cassy — Personal Super-Assistant (recurring)

Cassy is an **ethics-first, recurring personal assistant** that lives inside the same
Google Sheet / Apps Script project as `crm/` and works across **Gmail, Google
Calendar, Google Drive, Google Tasks, Google Contacts and Notion**. It runs on
time-driven triggers (the "recurring basis"), ships a Web App control panel usable
from the Gmail environment, and speaks **7 languages** (default English).

> Quest **#QCRAFT-CONDCHECKRUT** · for Builder Master Sigma · TZ **GMT+0** · Lang **EN**.
> The one-page runbook is in **[RUNBOOK.md](./RUNBOOK.md)**.

## Design principles (inherited from `crm/`)
- **Checked & balanced** — every action appended to the `AuditLog` tab.
- **Fair & square** — per-channel consent (default OFF), rate-limited, PII redacted.
- **Clear & friendly** — one Web App panel, plain labels, run-now buttons.
- **Read-only by default** — outbound send / external invite / delete require approval; **Aruba PEC never auto-actioned**.

## Files
| File | Purpose |
|---|---|
| `RUNBOOK.md` | The one-page "what Cassy does and when" |
| `appsscript.json` | Manifest, minimal OAuth scopes, web-app config (GMT timezone) |
| `Cassy.gs` | The 5 routines + delivery + consent helpers (reuses `Ethics`, `audit`) |
| `Triggers.gs` | `installCassyTriggers()` / `removeCassyTriggers()` (recurring schedule) |
| `i18n.gs` | Language ruler EN/IT/DE/ZH/JA/FR/HI |
| `WebApp.gs` + `WebApp.html` | Control panel (consent, lang, run-now, install) |
| `config.example.json` | Reference config (owner, TZ, channels, delivery, guardrails, bridges) |

## Reused from `crm/` (unchanged)
- `Ethics.assertConsent` / `withinRateLimit` / `redactPII` — `crm/Ethics.gs`
- `audit()`, `TABS`, `STAGES`, `getOrCreateTaskList_()` — `crm/Code.gs`

Cassy must be deployed **into the same Apps Script project** as `crm/` so these
symbols resolve. (Either paste both folders' `.gs` files, or `clasp push` a project
that contains both.)

## Install
1. Open the CRM-bound Google Sheet → **Extensions → Apps Script**.
2. Add the `cassy/` files alongside the `crm/` files (paste or `clasp push`).
3. Merge the extra OAuth scopes from `cassy/appsscript.json` into the project manifest.
4. **Deploy → New deployment → Web app** (*Execute as: me*, *Access: only myself*) → open the URL.
5. In the Cassy panel: flip channels **ON**, click a **Run-now** to test, then **Install triggers**.

## Recurring schedule (GMT)
`07:30` Morning Brief · `09–18` hourly Inbox Triage + Calendar Guard · `18:30` End-of-Day Wrap · `Mon 08:00` Weekly Hygiene.

---

## Output- & Process Grafcet (IEC 60848 style)

Aligned with `TEST1/GRAFCET_LCC_PROCESS.html` already in this repo.

```
            ┌─────────────────────────────┐
   ─────────┤ S0  IDLE (triggers armed)    │
   │        └─────────────┬───────────────┘
   │           t0 : time-trigger fires / Run-now
   │        ┌─────────────▼───────────────┐
   │        │ S1  CONSENT GATE            │  action: Cassy_assertChannel()
   │        └─────────────┬───────────────┘
   │      t1a: consent OFF │ t1b: consent ON
   │   ┌──────────────────┘ └─────────────────┐
   │ ┌─▼─────────────┐            ┌────────────▼────────────┐
   │ │ S1x  REFUSE   │            │ S2  RATE-LIMIT CHECK    │  Ethics.withinRateLimit()
   │ │ + audit       │            └────────────┬────────────┘
   │ └─┬─────────────┘          t2: within limit│
   │   │                        ┌───────────────▼───────────────┐
   │   │                        │ S3  READ (Gmail/Cal/Drive…)   │  outputs: data set
   │   │                        └───────────────┬───────────────┘
   │   │                              t3: data ready
   │   │                        ┌───────────────▼───────────────┐
   │   │                        │ S4  ACT (label / draft /      │  read-only or
   │   │                        │     propose / file)           │  approval-gated write
   │   │                        └───────────────┬───────────────┘
   │   │                              t4: actions done
   │   │                        ┌───────────────▼───────────────┐
   │   │                        │ S5  DELIVER (email/sheet/      │  outputs: digest
   │   │                        │     calendar/Notion) + AUDIT  │
   │   │                        └───────────────┬───────────────┘
   │   │                              t5: delivered + logged
   └───┴────────────────────────────────────────┘  → back to S0
```

**Phases:** S0 idle · S1 consent · S2 rate-limit · S3 read · S4 act · S5 deliver+audit.
**Transitions:** t0 trigger · t1a/t1b consent off/on · t2 within-limit · t3 data-ready · t4 acted · t5 delivered.
Every path returns to **S0** and writes at least one `AuditLog` row.

## Error handling — SWOT (KAIZEN / TRIZ-USIT)
| | Helpful | Harmful |
|---|---|---|
| **Internal** | **S**: reuses proven `Ethics`/audit; minimal scopes; degrades gracefully (capability probes); i18n built-in | **W**: GAS 6-min run cap; quotas; single-account; no native non-Google mail |
| **External** | **O**: add Notion digest, Drive filing, slot-proposal; Gmail Add-on card; IMAP bridge | **T**: API quota/scope changes; PEC legal constraints; over-automation eroding trust |

- **KAIZEN (continuous):** start narrow (read + label + draft), measure via `AuditLog`, widen only where it earns trust.
- **TRIZ-USIT:** *Segmentation* → consent split per channel; *Prior counteraction* → draft-not-send + approval gate; *Self-service* → capability probes let routines self-skip when a service is off; *Local quality* → quiet-hours suppress noise.

## Process KPIs / KEIs (Utere)
- **KPI:** triage precision (urgent flagged correctly), reply latency, conflicts caught, stale-deal closure rate.
- **KEI (effort):** tool-calls per digest, tokens per routine, trigger runtime vs the 6-min cap, % actions auto-handled vs approval-gated.

## PMAT roles
Coordinator (LCAI Claude Code) · 4 task agents — **Email · Calendar+Tasks · Docs+Notes · CRM+i18n** · 1 Checker agent (ethics + audit gate). Escalate to subagents only when token cost justifies; below that, the Coordinator runs the routines directly.

## Out of scope (flagged, not dropped)
Live API to Libero/Yahoo/AOL/Aruba/PEC (bridge design only) · auto-sending mail · any PEC write.
