# sdd-engineering — behavior evals

Run before every release, old and new cases (`docs/RELEASES.md`). Each case
states the setup, the input, the expected behavior and a pass criterion that
can be checked from the session transcript (`/agents`, tool calls, files
written).

## How to run

Load the plugin and its dependencies straight from the working tree, in a
**target repository that has no local copies** of these agents:

```
claude --plugin-dir <marketplace>/plugins/engineering-paved-path \
       --plugin-dir <marketplace>/plugins/research-tools \
       --plugin-dir <marketplace>/plugins/architecture-review \
       --plugin-dir <marketplace>/plugins/sdd-engineering
```

Fixture repo: any small TypeScript project with a `package.json` that has
`typecheck` and `test` scripts (for the "no command" case, delete them).

## Cases

| ID | Kind | File | Covers |
|---|---|---|---|
| P1 | positive | [positive/spec-creator-basic.md](positive/spec-creator-basic.md) | spec-creator activates, asks blocking questions, writes EARS spec without implementation details (spec AC-10) |
| P2 | positive | [positive/planner-from-spec.md](positive/planner-from-spec.md) | planner builds plan only from the spec (AC-11) |
| P3 | positive | [positive/namespaces-resolve.md](positive/namespaces-resolve.md) | namespaced agents and skills resolve without warnings |
| P4 | positive | [positive/implementer-no-test-command.md](positive/implementer-no-test-command.md) | implementer asks instead of inventing a command (AC-13) |
| N1 | negative | [negative/unrelated-request.md](negative/unrelated-request.md) | no SDD agent on an unrelated request (AC-15) |
| N2 | negative | [negative/retro-not-automatic.md](negative/retro-not-automatic.md) | workflow-retro never runs without an explicit request (AC-14) |
| W1 | workflow | [workflow/spec-plan-run.md](workflow/spec-plan-run.md) | spec → plan → implement → review → verify chain (AC-12) |

Record results (pass/fail, model, plugin version, date) in the release PR.
