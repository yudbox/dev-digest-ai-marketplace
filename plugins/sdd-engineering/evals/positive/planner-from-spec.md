# P2 — implementation-planner plans only what the spec says

**Setup:** the spec produced by P1 (or any spec with 3–5 ACs).

**Input:** `plan specs/SPEC-<date>-<name>.md`

**Expected:**
1. `sdd-engineering:implementation-planner` runs STEP 0 (VRF): re-state table `R1..Rn`, gaps, questions with defaults.
2. It spawns only `research-tools:researcher` (no other agent type).
3. It asks for execution mode before writing.
4. It writes exactly one file: `plans/PLAN-<today>-<name>.md`.
5. Every plan AC maps to a spec AC (`Source` column); no requirement appears that is absent from the spec.

**Pass:** all 5 hold.
