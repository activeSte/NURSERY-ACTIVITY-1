# CRM — Google Apps Script

A small, ethics-first CRM that lives **inside one Google Sheet** and integrates with **Gmail** and **Google Tasks**. Includes a dashboard, Gantt and PERT diagrams.

## Design principles

- **Checked & balanced** — every write is audited (`AuditLog` tab).
- **Fair & square** — Gmail reads only after explicit consent toggle; rate-limited.
- **Clear & friendly** — single `CRM` menu, plain labels, confirm dialogs.
- **GDPR-minimal** — only the fields needed for a deal; PII redacted in logs.

## Files

| File | Purpose |
|---|---|
| `appsscript.json` | Manifest, minimum OAuth scopes |
| `Code.gs` | Menu, init, Gmail→Deal, Tasks sync |
| `Ethics.gs` | Consent, rate-limit, PII redaction |
| `Charts.gs` | Pipeline funnel + monthly revenue |
| `Gantt.gs` | Date-grid Gantt from `Tasks` tab |
| `Pert.gs` | Critical-path calc + highlighted table |
| `.clasp.json.example` | Template for local push via [clasp](https://github.com/google/clasp) |

## Install

1. Create a new Google Sheet (it will be the "bound" host).
2. **Extensions → Apps Script** → delete the empty `Code.gs`.
3. Either paste each `*.gs` file manually, **or** use `clasp`:
   ```bash
   npm i -g @google/clasp
   clasp login
   cd crm/
   cp .clasp.json.example .clasp.json
   # put the scriptId from the Apps Script editor settings
   clasp push
   ```
4. Reload the spreadsheet — a **CRM** menu appears.
5. Run **CRM → ① Initialise sheet** to create the 4 tabs.
6. **CRM → Toggle Gmail consent** to enable Gmail reads.

## Daily use

| Action | Menu item |
|---|---|
| Convert a Gmail thread into a Deal | `Add deal from selected Gmail thread` |
| Push open deals to Google Tasks | `Sync deals → Google Tasks` |
| See pipeline + revenue | `Build dashboard` |
| See timeline | `Render Gantt` |
| See critical path | `Render PERT` |
| Audit trail | `Show audit log` |

## Tabs

- **Contacts** — `id, name, email, phone, company, notes, createdAt`
- **Deals** — `id, title, contactId, stage, value, openedAt, dueDate, notes`
- **Tasks** — `id, dealId, title, start, end, depends, status, owner`
- **AuditLog** — `ts, user, action, target, detail` (read-only by convention)

Stage values: `Lead, Qualified, Proposal, Won, Lost`.
`Tasks.depends` is a comma-separated list of task IDs (used by PERT).

## Permissions

The manifest requests only:
- `spreadsheets.currentonly` — never touches other Sheets
- `gmail.modify` — read selected threads and add `CRM/*` labels
- `tasks` — manage the `CRM` task list only
- `script.container.ui` — show the menu and dialogs

Revoke any time at <https://myaccount.google.com/permissions>.
