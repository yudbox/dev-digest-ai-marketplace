# SDD Engineering

> Demo content for local development of the catalog site.

Spec-Driven Development for Claude Code: take a feature request through a spec, a plan and an implementation, and verify the result before it ships.

## Workflow

1. `spec-creator` turns the request into an EARS spec and asks blocking questions first.
2. `implementation-planner` breaks the approved spec into an ordered plan.
3. `implementer` carries out the plan step by step.
4. `plan-verifier` checks the change against the spec and the plan.

After a feature ships, run the retro skill:

```
/sdd-engineering:retro
```

## Dependencies

Uses `research-tools`, `architecture-review` and `engineering-paved-path`.
