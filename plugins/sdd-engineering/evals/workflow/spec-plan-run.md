# W1 — full chain: spec → plan → implement → review → verify

**Setup:** fixture repo with `typecheck` and `test` scripts; a small feature
("add a `GET /health` endpoint returning `{status:'ok'}`").

**Steps:**
1. `write a spec for a health endpoint` → spec written (P1 criteria).
2. `plan <spec path>` → plan written (P2 criteria), single-agent mode.
3. `/run-plan <plan path>`.

**Expected in step 3, in this order:**
1. `sdd-engineering:implementer` runs; reports `START_SHA`, the discovered commands, typecheck ✓, tests ✓.
2. `architecture-review:architecture-reviewer` runs on the files changed since `START_SHA`; report ends with `Verdict: PASS` or `FAIL`.
3. If FAIL → implementer fix loop, at most 3 iterations.
4. `sdd-engineering:plan-verifier` prints a coverage matrix with every plan AC.
5. `/run-plan` summary lists all three phases.

**Pass:** the three agents ran in the order above and every plan AC appears in the coverage matrix.
