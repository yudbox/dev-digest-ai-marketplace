# Research Tools

A **read-only research agent** for Claude Code. Ask it to find something in
your codebase or look something up on the web; it answers in a fixed,
skimmable format and never changes a file.

## Use case

- "Where is `SkillRow` defined and who uses it?"
- "Which files import `fastify-type-provider-zod`, and what is that library?"
- "What does this error mean: `ERR_REQUIRE_ESM`?"

Useful on its own, and as the investigation sub-agent of
[`sdd-engineering`](../sdd-engineering/README.md) (`spec-creator` and
`implementation-planner` delegate all codebase exploration to it).

## Components

| Component | Description |
|---|---|
| agent `research-tools:researcher` | Picks a mode (project / web / mixed), searches exhaustively, then answers in three layers: **summary table → Mermaid diagram → detailed notes**. Orients itself in any repository from `CLAUDE.md`, `AGENTS.md`, `README.md` and workspace manifests — no built-in project map. |

### What it does

| Mode | How it searches |
|---|---|
| Project | `Glob`/`LS` to locate → `Grep` (and read-only `Bash` pipelines) to search → `Read` to confirm. Covers all hits, not just the first. |
| Web | `WebSearch` first; `WebFetch` only the top 2 pages if snippets are not enough; never more than 3 fetches per query. |
| Mixed | Project first, then web, two separate report sections. |

Guarantees: asks at most 2–3 clarifying questions when the query is vague;
mirrors the language of your question; says "Nothing found" with what was
searched instead of guessing; never fabricates paths.

## Requirements

| | |
|---|---|
| Claude Code | ≥ 2.1.110 recommended (same as the rest of this marketplace) |
| Tools | `Read, Grep, Glob, LS, Bash, WebFetch, WebSearch` |
| Write access | **none** — `Bash` is restricted by its prompt to read-only commands |
| Network | `WebSearch` / `WebFetch` in web mode only |
| Secrets | none |
| Dependencies | none |

## Installation

```
/plugin marketplace add yudbox/dev-digest-ai-marketplace
/plugin install research-tools@dev-digest-ai-marketplace
```

Project scope: add `--scope project` to both commands (CLI form:
`claude plugin …`). Installing `sdd-engineering` installs this plugin
automatically.

## Quick start

```
find where the request logger is configured and which routes skip it
```

Expected: `research-tools:researcher` runs in project mode and returns a
table of `file:line` matches, a small `graph LR` of the relevant files, and
notes.

## Verification

1. `/agents` lists `research-tools:researcher`.
2. Ask a project question → the answer has the three layers and cites only files that exist.
3. Ask it to "rename X to Y" → it refuses to edit and only reports where X is used.

Cases: [`evals/`](evals/README.md).

## Support

Owner: @yudbox · backup: _not assigned yet_ · bugs: [GitHub issues](https://github.com/yudbox/dev-digest-ai-marketplace/issues) (label `research-tools`) · versions: [`CHANGELOG.md`](CHANGELOG.md) · [`COMPATIBILITY.md`](COMPATIBILITY.md)
