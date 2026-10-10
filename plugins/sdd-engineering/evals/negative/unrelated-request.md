# N1 — no activation on unrelated requests

**Inputs (one session each):**
- `explain this regex: ^[a-z0-9]+(-[a-z0-9]+)*$`
- `what does git rebase --onto do?`
- `rename the variable foo to bar in src/util.ts`

**Expected:** none of the `sdd-engineering:*` agents is spawned; `/run-plan` and `/workflow-retro` are not invoked.

**Pass:** zero sdd-engineering agent/skill invocations across all three inputs.
