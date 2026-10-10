# run-plan skill

Orchestrates the full SDD implementation pipeline from an existing `PLAN-*.md`.
Part of the `sdd-engineering` plugin.

## Prerequisites

Run these **before** `/run-plan`:
1. `sdd-engineering:spec-creator` → produces `SPEC-*.md`
2. `sdd-engineering:implementation-planner` → produces `plans/PLAN-*.md`

Dependency plugins must be installed and enabled (they are, if you installed
`sdd-engineering` from the marketplace): `architecture-review`,
`engineering-paved-path`, `research-tools`.

## Usage

```
/run-plan plans/PLAN-<feature>.md
```

## What it does

```
Phase 1: Implementation
  → reads Execution Mode from plan
  → single-agent OR implementer (backend) ∥ implementer (frontend)

Phase 2: Architecture Fix Loop (max 3 iterations)
  → architecture-review:architecture-reviewer (scoped to changed files)
  → if CRITICAL/HIGH: implementer fixes → re-run
  → stops when clean or at max iterations

Phase 3: Final Verification
  → sdd-engineering:plan-verifier — reports AC coverage matrix
  → does NOT block

Phase 4: Summary report
```

## What it does NOT do

- Does not run `spec-creator` or `implementation-planner` (manual steps)
- Does not write extra tests beyond what the plan asks for
- Does not push to git or open a PR
- Does not run `/workflow-retro` (explicit request only)

## Based on

| Practice | Source |
|---|---|
| Orchestration skill reads the plan DAG instead of the user retyping the workflow | Internal practice (SDD workflow, 2026-07) |
| Architecture review before extra tests: structural fixes change test locations | Onion Architecture enforcement — moving code between layers changes file paths |
| plan-verifier as final non-blocking report | Its purpose is to verify implementation matches the plan, not to gate the pipeline |
| Max 3 fix iterations to prevent infinite loops | Common agentic loop safety pattern |
| Scope the architecture reviewer to the diff only | Efficiency: unchanged files cannot have new violations |
