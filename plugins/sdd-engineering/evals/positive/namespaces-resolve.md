# P3 — namespaced components resolve

**Setup:** all four plugins loaded (see README → How to run).

**Checks:**
1. `/agents` lists `sdd-engineering:spec-creator`, `sdd-engineering:implementation-planner`, `sdd-engineering:implementer`, `sdd-engineering:plan-verifier`, `research-tools:researcher`, `architecture-review:architecture-reviewer`.
2. Starting `sdd-engineering:spec-creator` produces no "unknown skill" warning for its `skills:` list (`engineering-paved-path:*`, `sdd-engineering:engineering-insights`).
3. `/run-plan` and `/workflow-retro` are available as skills.

**Pass:** all 3 hold.
