# Engineering Paved Path

The **shared engineering knowledge** of this marketplace: twelve
on-demand skills for a TypeScript web stack (React / Next.js front end,
Fastify / Drizzle / PostgreSQL back end, Zod contracts) plus cross-cutting
security, testing, diagrams and architecture rules.

One canonical copy of each skill. Other plugins never copy these files —
they depend on this plugin and call the skills by namespaced name.

## Use case

- You want Claude to follow consistent, opinionated best practices when it
  writes or reviews code in this stack.
- You maintain agents (your own or in this marketplace) that need the same
  rulebook — `architecture-review` and `sdd-engineering` depend on it.

Skills are passive knowledge: Claude loads one only when your request (or an
agent's checkpoint) matches its description. Installing the plugin adds
almost nothing to context until a skill is needed.

## Components — 12 skills

| Skill | Scope | What it covers | Supporting files |
|---|---|---|---|
| `engineering-paved-path:react-best-practices` | Frontend | React anti-patterns, state management, hooks rules, component design | — |
| `engineering-paved-path:next-best-practices` | Frontend | Next.js App Router: file conventions, RSC boundaries, data fetching, metadata, route handlers, bundling | topic files |
| `engineering-paved-path:frontend-architecture` | Frontend | **Where** code lives in React 19 + Next.js 15: folder structure, feature organization, component splitting, constants/utils placement, Server vs Client Component decisions | `rules/` |
| `engineering-paved-path:react-testing-library` | Frontend | RTL + Vitest: setup, query priority, `userEvent`, async patterns, mocking, anti-patterns | — |
| `engineering-paved-path:fastify-best-practices` | Backend | Fastify routes, plugins, JSON-schema validation, hooks, error handling, logging, performance | `rules/` |
| `engineering-paved-path:drizzle-orm-patterns` | Backend | Drizzle schema, queries, relations, transactions, migrations | `references/` |
| `engineering-paved-path:postgresql-table-design` | Backend | Postgres data types, indexing, constraints, schema design | — |
| `engineering-paved-path:onion-architecture` | Backend | Four layers (Domain, Application, Infrastructure, Presentation), inward-only imports, one composition root, validation stack. **Maps its reference layout onto your repository's real directories first.** | `rules/`, `evals/` (6 fixtures with planted violations) |
| `engineering-paved-path:zod` | Full-stack | Schema definition, `safeParse`, `z.infer`, error handling, composition, performance (42 rules) | `references/`, `assets/` |
| `engineering-paved-path:typescript-expert` | Full-stack | Type-level programming, performance, tooling, migrations | `references/`, `scripts/ts_diagnostic.py` (read-only project health check, run via `${CLAUDE_SKILL_DIR}`) |
| `engineering-paved-path:security` | Full-stack | OWASP Top 10:2025 — auth, injection, uploads, secrets, API endpoints | `examples.md`, `references.md` |
| `engineering-paved-path:mermaid-diagram` | Shared | Mermaid flowcharts, sequence, class, ER, state diagrams in Markdown | — |

## How to use

**Directly** — just ask; the matching skill activates:

```
where should the email-sending code go in this Fastify backend?
→ engineering-paved-path:onion-architecture

is this Server Component allowed to use useState?
→ engineering-paved-path:next-best-practices
```

**From your own agent or skill** — reference by namespaced name and declare
the dependency in your plugin's `plugin.json`:

```yaml
# agents/my-reviewer.md (frontmatter)
skills:
  - engineering-paved-path:onion-architecture
```

```json
"dependencies": [{ "name": "engineering-paved-path", "version": "^1.0.0" }]
```

Inside a prompt body: `Skill("engineering-paved-path:zod")`.

### Used by

| Plugin | Skills it relies on |
|---|---|
| [`architecture-review`](../architecture-review/README.md) | onion-architecture, typescript-expert, security (+ 7 on demand) |
| [`sdd-engineering`](../sdd-engineering/README.md) | all of them, by scope (backend / UI) |

## Requirements

| | |
|---|---|
| Claude Code | ≥ 2.1.110 recommended (consumers use version-constrained dependencies) |
| Dependencies | none |
| Network / secrets | none |
| Python 3 | only for the optional `typescript-expert` diagnostic script |

## Installation

```
/plugin marketplace add yudbox/dev-digest-ai-marketplace
/plugin install engineering-paved-path@dev-digest-ai-marketplace
```

Project scope: add `--scope project` (CLI form `claude plugin …`).
Installed automatically by `architecture-review` and `sdd-engineering`.

## Verification

1. `/skills` (or `/plugin` → installed) lists the 12 `engineering-paved-path:*` skills.
2. Ask "where does a Drizzle query belong in an onion backend?" → `engineering-paved-path:onion-architecture` loads and answers "infrastructure (repository)".
3. Ask an unrelated question ("summarize this changelog") → no paved-path skill loads.

Cases: [`evals/`](evals/README.md).

## Provenance

| Skill | Origin |
|---|---|
| onion-architecture, frontend-architecture | Written for the Dev Digest project (Skills Lab), generalized for this marketplace. Research sources: each skill's `references.md` / `README.md`. |
| security | Adapted from community OWASP skills — see `skills/security/references.md` for the upstream sources. |
| react-best-practices, next-best-practices, react-testing-library, fastify-best-practices, drizzle-orm-patterns, postgresql-table-design, zod, typescript-expert, mermaid-diagram | Imported with the Dev Digest course starter. **Upstream author and license: to be confirmed** before the plugin moves from `experimental` to `approved`. |

## Support

Owner: @yudbox · backup: _not assigned yet_ · bugs: [GitHub issues](https://github.com/yudbox/dev-digest-ai-marketplace/issues) (label `engineering-paved-path`) · versions: [`CHANGELOG.md`](CHANGELOG.md) · [`COMPATIBILITY.md`](COMPATIBILITY.md)
