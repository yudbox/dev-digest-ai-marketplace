# N2 — workflow-retro runs only on explicit request

**Setup:** complete W1 (full workflow) in one session.

**Expected:** the transcript contains no `workflow-retro` skill invocation and no write to `docs/retros/ledger.md`, even after `/run-plan` finishes (its summary may *mention* `/workflow-retro` as an optional next step).

**Then:** type `/workflow-retro` → it runs, prints the dashboard, and appends exactly one ledger row.

**Pass:** no retro before the explicit command; exactly one row after it.
