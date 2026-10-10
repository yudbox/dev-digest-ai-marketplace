# Compatibility — research-tools

| Client | Version tested | Status | Notes |
|---|---|---|---|
| Claude Code | 2.1.296 | supported | No version-specific features; ≥ 2.1.110 recommended to match the marketplace. |
| Other clients | not tested | not supported | The agent file format (frontmatter `tools`, `model`, `color`) is Claude Code-specific. |

## Degraded behavior

- **No network** → web mode returns "Nothing found — web tools unavailable"; project mode is unaffected.
- **No `CLAUDE.md` / README** → the agent maps the repository from manifests and `LS` only, and says so.

## Migration notes

- From a local `.claude/agents/researcher.md`: remove the local copy — it shadows the plugin agent. Callers should use `research-tools:researcher` as `subagent_type`.
