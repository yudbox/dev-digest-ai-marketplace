# Compatibility — engineering-paved-path

| Client | Version tested | Status | Notes |
|---|---|---|---|
| Claude Code | 2.1.296 | supported | Plain skills; no version-specific features. |
| Agent Skills clients (Codex, Cursor, …) | not tested | expected to work, unverified | Skills are plain `SKILL.md` + frontmatter (portable core). `${CLAUDE_SKILL_DIR}` in `typescript-expert` is Claude Code-specific — elsewhere run the script by its path inside the skill directory. |

## Degraded behavior

- **No `python3`** → the optional `typescript-expert` diagnostic script cannot run; the skill's guidance is unaffected.
- **Stack mismatch** (e.g. Express instead of Fastify, Prisma instead of Drizzle) → stack-specific skills don't trigger; `onion-architecture`'s layer rules still apply.

## Migration notes

- From local copies in `.claude/skills/`: remove local skills with the same names — local skills shadow plugin skills and the namespaced references in consumer plugins would point at a different text.
