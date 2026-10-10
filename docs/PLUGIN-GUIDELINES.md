# Plugin Guidelines

How to structure and add a plugin to this marketplace.

## What makes a good plugin boundary

Start from a **finished workflow**, not from file types. A plugin answers
one question — e.g. `sdd-engineering`: "how do we go from a feature
request to a verified implementation?"

Components belong in the same plugin when they share an audience, have
similar permissions, have the same owner, and must be updated and rolled
back together. Publish a component as its **own** plugin (and depend on
it) when it is useful on its own, is consumed by several workflows, or
needs sensitive permissions (network, credentials, write tools).

Keep **project-specific** rules out of this catalog — architecture,
module names and paths of one repository belong in that repository's
`CLAUDE.md` / docs, not in a shared plugin.

## Directory layout

Each plugin lives at `plugins/<plugin-name>/`. Inside that folder:

```
plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json            # ONLY the manifest goes here
├── skills/<skill-name>/       # optional — SKILL.md + scripts/ references/ assets/
├── agents/                    # optional — one <agent-name>.md per agent
├── commands/                  # optional
├── hooks/hooks.json           # optional
├── .mcp.json                  # optional — config only, never credentials
├── evals/                     # REQUIRED — behavior cases (see below)
├── README.md                  # REQUIRED
├── CHANGELOG.md               # REQUIRED
└── COMPATIBILITY.md           # REQUIRED
```

Only `plugin.json` goes inside `.claude-plugin/`. Component directories
(`commands/`, `agents/`, `skills/`, `hooks/`, etc.) must live at the plugin's
own root, not inside `.claude-plugin/` — otherwise Claude Code will not find
them.

### Required files

| File | Must contain |
|---|---|
| `README.md` | **Use case** (what problem, for whom) · **Components** (each skill/agent/hook/MCP and why it's there) · **Requirements** (Claude Code version, external tools, network access, secret slots, filesystem/command access) · **Installation** (exact commands for project and user scope) · **Quick start** (one real request + expected activation + result) · **Verification** (smoke eval) · **Support** (primary owner, backup owner, where to report bugs) |
| `CHANGELOG.md` | One entry per version: version, date, release SHA, `Added` / `Changed` / `Fixed` / `Deprecated` / `Security` / breaking changes. Top of file names the **last-known-good** release. |
| `COMPATIBILITY.md` | Clients and versions the plugin was smoke-tested on; minimum Claude Code version and the feature that requires it; unsupported fields and degraded behavior per client (not "fully supported"); migration notes between major versions. |
| `evals/` | **Positive** cases (the component should activate and produce X), **negative** cases (must not activate on an unrelated task), and at least one **workflow** case for the full composition. Run before every release. |

## `plugin.json` fields

The only required field (if the manifest is present at all) is `name`,
which must be kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`) and match the plugin's
folder name. In this marketplace `version`, `description` and `author` are
also mandatory.

Common optional fields: `displayName`, `homepage`, `repository`,
`license`, `keywords`, `commands`, `agents`, `skills`, `hooks`,
`mcpServers`, `dependencies`, `defaultEnabled`.

`plugin.json` is the **source of truth** for a plugin's version and
components. Do not duplicate `version` or component definitions in the
`marketplace.json` entry — the entry only points at `source` and carries
catalog metadata.

## Dependencies

A plugin that needs another plugin declares it in `plugin.json`:

```json
{
  "name": "sdd-engineering",
  "version": "1.0.0",
  "dependencies": [
    { "name": "engineering-paved-path", "version": "^1.0.0" },
    { "name": "research-tools", "version": "^1.0.0" },
    { "name": "architecture-review", "version": "^1.0.0" }
  ]
}
```

- Version constraints require **Claude Code ≥ 2.1.110** — state this in
  the plugin's `COMPATIBILITY.md`.
- Use `^x.y.z` (any compatible minor/patch) by default; `~x.y.z`
  (patch-only) when even a minor change of the dependency is risky.
- Ranges resolve against git tags `{plugin-name}--v{version}` in this repo
  (`docs/RELEASES.md` → Tag convention). Release dependencies first.
- **Reference dependency components by their namespaced name**:
  `engineering-paved-path:zod`, `research-tools:researcher`,
  `architecture-review:architecture-reviewer`. Never copy a dependency's
  skill into your plugin — one source per instruction.
- Do not declare a dependency "just in case": every dependency is
  installed for every user of your plugin.

## Paths: everything inside the plugin directory

Installed plugins are **copied into a versioned cache** directory
(`~/.claude/plugins/cache`). Consequences:

- A plugin cannot reach outside its own folder — `../shared-utils` will
  not exist after install. Shared code goes into a dependency plugin.
- All component path fields must be relative and start with `./`.
- Never use an absolute path (`/Users/...`, `/home/...`, `C:\...`) in a
  manifest, hook command, MCP server command/args, agent prompt or skill.

Use the environment variables Claude Code provides instead:

| Variable | Use for |
|---|---|
| `${CLAUDE_PLUGIN_ROOT}` | files at the plugin's root (hook scripts, MCP server binaries). Changes on every update — **never store state here**. |
| `${CLAUDE_SKILL_DIR}` | scripts and references **inside a skill's own directory**, e.g. `python3 "${CLAUDE_SKILL_DIR}/scripts/analyze.py"`. Also changes on update. |
| `${CLAUDE_PLUGIN_DATA}` | persistent per-plugin data that must survive updates. |
| `${CLAUDE_PROJECT_DIR}` | the user's project root. |

## Removing project assumptions

When extracting a component from a product repository:

- Remove paths, module names and package names that exist only in that
  repository; replace them with **explicit inputs** ("read the project's
  architecture doc, if present") or with discovery steps.
- Document where the workflow writes its artifacts (specs, plans) and
  how the user can change that location.
- Describe the fallback when an expected project command (test,
  typecheck) is not found — ask the user, never invent one.
- Review each agent's `tools:` list; read-only agents get read-only tools.
- Remove instructions duplicated between an agent prompt and a skill —
  keep the detail in the skill (loaded on demand), keep the agent short.

## Keep `SKILL.md` portable

Write `SKILL.md` files as plain Markdown with YAML frontmatter only — avoid
Claude-Code-specific syntax or assumptions where possible. The Agent Skills
format (`SKILL.md`, `scripts/`, `references/`, `assets/`) is the portable
core; agents, hooks, permissions and MCP config are the client-specific
adapter. Anything a client does not support is listed in
`COMPATIBILITY.md`.

## Adding a new plugin

See `CONTRIBUTING.md` at the repo root for the full step-by-step workflow
(branch, marketplace entry, `CODEOWNERS`, `CHANGELOG.md`, local validation,
PR, review/release ownership). This file is the structure/manifest
reference that workflow points back to.

## Don't over-build governance early

Explore first, standardise later: don't add process, per-plugin CODEOWNERS
entries, or extra CI gates beyond what's in this repo until there are
actually 2-3 real plugins that justify it. Premature governance just slows
down the first real contributions.
