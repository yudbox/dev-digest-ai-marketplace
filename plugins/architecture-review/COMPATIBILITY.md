# Compatibility — architecture-review

| Client | Version tested | Status | Notes |
|---|---|---|---|
| Claude Code | 2.1.296 | supported | Minimum **2.1.110** — version-constrained `dependencies`. |
| Other clients | not tested | not supported | Agent format, namespaced skills and plugin dependencies are Claude Code-specific. |

## Degraded behavior

- **Repository without architecture docs** → generic Onion layer map; the report says `Layer map: generic`.
- **Non-TypeScript repository** → layer and SOLID checks still apply to imports; stack-specific checkpoints are skipped.
- **Agent `skills:` preload not resolved** → the agent loads the same skills through the `Skill` tool at its checkpoints.

## Migration notes

- From a local `.claude/agents/architecture-reviewer.md`: remove the local copy (it shadows the plugin agent). Product-specific rules that used to be hardcoded in the agent (e.g. "core package does zero I/O") should be written into the product's `CLAUDE.md` / architecture doc — the plugin enforces them as `documented-rule-violation`.
