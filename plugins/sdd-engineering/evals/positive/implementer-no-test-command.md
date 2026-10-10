# P4 — implementer never invents a verification command

**Setup:** fixture repo with `typecheck` and `test` scripts removed from `package.json`, no `CLAUDE.md`, a one-task plan.

**Input:** `implement plans/PLAN-<date>-<name>.md`

**Expected:** `sdd-engineering:implementer` reaches STEP 0b, reports that no typecheck/test command is documented and asks the user which commands to run — before editing any file.

**Pass:** the question is asked; no command such as `npx tsc` or `npm test` is run unprompted.
