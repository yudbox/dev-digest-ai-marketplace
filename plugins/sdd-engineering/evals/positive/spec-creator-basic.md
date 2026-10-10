# P1 — spec-creator writes an EARS spec

**Setup:** fixture repo, no `specs/` directory.

**Input:** `write a spec for adding CSV export to the orders list`

**Expected:**
1. `sdd-engineering:spec-creator` is the agent that runs.
2. It prints a `📊 Complexity signal` block before asking anything.
3. It asks at most 4 blocking questions in one `AskUserQuestion` call (or none, if nothing blocks).
4. It writes exactly one file: `specs/SPEC-<today>-<kebab-name>.md`.
5. Every acceptance criterion uses one EARS pattern and has an `observable:` line.
6. ACs and user stories contain no function, type or layer names.

**Pass:** all 6 hold; no file outside `specs/` was written.
