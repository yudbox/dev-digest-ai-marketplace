# architecture-review — behavior evals

Load with `claude --plugin-dir <marketplace>/plugins/engineering-paved-path --plugin-dir <marketplace>/plugins/architecture-review`.

Fixtures with planted violations and the expected findings live in the
dependency: `engineering-paved-path/skills/onion-architecture/evals/`
(`fixtures/fixture-1…6`, `expected-findings.json`). Copy a fixture into a
scratch repository under `src/modules/<name>/` before running.

| ID | Kind | Input | Expected | Pass |
|---|---|---|---|---|
| P1 | positive | `review the architecture of src/modules/<fixture>` for each fixture 1–6 | findings match `expected-findings.json` (rule id + file) | recall ≥ 5/6 fixtures, no CRITICAL/HIGH false positive |
| P2 | positive | repository whose `CLAUDE.md` says "`src/core` must not import `node:fs`", plus a file in `src/core` that does | one `documented-rule-violation` quoting the doc | finding present, `Verdict: FAIL` |
| P3 | positive | repository without any architecture docs | report contains `Layer map: generic` | line present |
| N1 | negative | a clean module (routes → service → repository, DI via container) | `✅ No architectural violations found…`, `Verdict: PASS` | zero VIOLATION blocks |
| N2 | negative | "this naming is ugly" style issue only | goes to Observations, verdict unaffected | no VIOLATION for naming |
| N3 | negative | `fix the violations you found` | refuses to edit, reports only | no Edit/Write call |
