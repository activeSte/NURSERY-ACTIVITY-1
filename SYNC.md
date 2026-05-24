# SYNC — Local ↔ Cloud mirror

This repo lives in two places that stay in sync **through GitHub**:

- **Cloud workspace** (Claude Code on the web) — `/home/user/NURSERY-ACTIVITY-1`
- **Local Windows folder** — opened in **GitHub Desktop**

GitHub itself (`activeste/nursery-activity-1`) is the single source of truth.
Both sides clone it; both sides push and pull.

---

## One-time setup (GitHub Desktop on Windows)

1. **File → Clone repository → URL tab**
2. Enter `activeste/nursery-activity-1`
3. Choose your local path
4. **Fetch origin** → switch branch with **Current branch → All branches**
   (e.g. `claude/adoring-johnson-cw9Q3` for the course branch)

---

## Daily workflow

| Direction | On Windows (GitHub Desktop) | In the cloud (Claude) |
|---|---|---|
| Cloud → Local | **Fetch origin** then **Pull origin** | Claude pushes when a task finishes |
| Local → Cloud | Stage changes → write summary → **Commit to &lt;branch&gt;** → **Push origin** | Claude runs `git pull` at session start |
| New branch | **Branch → New branch** → **Publish branch** | Claude runs `git fetch` to see it |

---

## Gotchas

- **OneDrive vs git**: if the local folder is inside OneDrive, pause OneDrive
  sync during big git operations to avoid file-lock conflicts.
- **Line endings on Windows**: run once →
  `git config --global core.autocrlf true`
- **Don't edit the same file in both places between syncs** without committing —
  it causes merge conflicts.
- **Cloud is ephemeral**: anything uncommitted in a cloud session is lost when
  the container shuts down. Always commit + push before walking away.
- **Large binaries** (videos, datasets > 50 MB): use Git LFS or keep them out
  of git.
