# Compatibility — sdd-engineering

| Client | Version tested | Status | Notes |
|---|---|---|---|
| Claude Code | 2.1.296 | supported | Minimum **2.1.110** — required for version-constrained `dependencies` in `plugin.json`. |
| Other Agent Skills clients (Codex, Cursor, …) | not tested | not supported | Skills are plain `SKILL.md`, but agents, the `skills:` preload field, `permissionMode`, `${CLAUDE_SKILL_DIR}` / `${CLAUDE_PLUGIN_DATA}` and plugin dependencies are Claude Code-specific. |

## Claude Code features this plugin relies on

| Feature | Used by | If unavailable |
|---|---|---|
| Plugin `dependencies` with semver ranges (≥ 2.1.110) | installer | dependencies must be installed by hand |
| Namespaced plugin components (`plugin:component`) | all agents, `run-plan` | agents cannot find dependency skills/agents |
| Agent `skills:` preload with namespaced names | all agents | agents still load skills on demand via the `Skill` tool at their checkpoints |
| `${CLAUDE_SKILL_DIR}` | `workflow-retro` | the journal script cannot be located → retro falls back to `N/A` token columns |
| `${CLAUDE_PLUGIN_DATA}` | `workflow-retro` price cache | prices are fetched per run, not cached |
| `permissionMode: acceptEdits` | `implementer` | user confirms each edit |

## Degraded behavior

- **No `python3`** → `/workflow-retro` cannot parse transcripts; token/cost columns are `N/A`, the rest of the retro still runs.
- **No network** → spec-creator cannot fetch design links; workflow-retro uses cached or `N/A` prices; researcher works in project mode only.
- **Repository without `CLAUDE.md` / architecture docs** → agents fall back to generic conventions and say so in their reports.

## Migration notes

- From local copies in `.claude/agents/` (pre-plugin): remove the local `spec-creator.md`, `implementation-planner.md`, `implementer.md`, `plan-viewer.md` and the local `run-plan`, `workflow-retro`, `engineering-insights` skills — local files shadow plugin components. `plan-viewer` is now `plan-verifier`.
- Rollback: see the marketplace `docs/RELEASES.md` → Rollback (stable channel pinned to the last-known-good tag).
