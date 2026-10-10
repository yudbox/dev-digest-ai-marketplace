# dev-digest-ai-marketplace

A [Claude Code](https://code.claude.com) plugin marketplace for the Dev
Digest AI project.

## Install

```
/plugin marketplace add yudbox/dev-digest-ai-marketplace
```

or, from the CLI:

```
claude plugin marketplace add yudbox/dev-digest-ai-marketplace
```

## Plugins

| Plugin | Version | What it is | Depends on |
|---|---|---|---|
| [`sdd-engineering`](plugins/sdd-engineering/README.md) | 1.0.0 | Spec-Driven Development workflow: spec-creator → implementation-planner → `/run-plan` (implementer → architecture review → plan-verifier), `/workflow-retro`, engineering-insights | the three below |
| [`engineering-paved-path`](plugins/engineering-paved-path/README.md) | 1.0.0 | 12 shared engineering skills (React, Next.js, Fastify, Drizzle, PostgreSQL, Zod, TypeScript, security, testing, Mermaid, Onion Architecture) | — |
| [`research-tools`](plugins/research-tools/README.md) | 1.0.0 | Read-only `researcher` agent (codebase + web) | — |
| [`architecture-review`](plugins/architecture-review/README.md) | 1.0.0 | Read-only `architecture-reviewer` agent (layering, DI, SOLID, PASS/FAIL) | `engineering-paved-path` |

Install the whole SDD workflow with one command — dependencies come along:

```
/plugin install sdd-engineering@dev-digest-ai-marketplace
```

Dependency graph and runtime call graph: [`docs/DEPENDENCY-GRAPH.md`](docs/DEPENDENCY-GRAPH.md).
To add a plugin, see `CONTRIBUTING.md` — a copy-paste starting point lives at
`templates/example-plugin/`.

## Why a separate repository

The marketplace does not live inside the Dev Digest product repo: the
product and the team harness have different owners and release cadences.
A Dev Digest UI change must not publish a new skill version, and a skill
fix must not require a product release.

## Repository layout

- `.claude-plugin/marketplace.json` — the marketplace manifest.
- `plugins/` — one folder per published plugin (see the table above).
- `templates/example-plugin/` — starter template for new plugins (never
  itself registered as a plugin).
- `CONTRIBUTING.md` — contributor workflow (branch → PR → review),
  dependency rules, PR checklist; links out to the docs below.
- `CODEOWNERS` — who reviews which plugin.
- `docs/PLUGIN-GUIDELINES.md` — plugin boundary, structure, required
  files, manifest fields, dependencies, path variables.
- `docs/SECURITY.md` — trust model, review before approval, permissions,
  secrets, response to an unsafe release.
- `docs/RELEASES.md` — SemVer, `{plugin}--v{version}` tags, release
  order, `latest`/`stable` channels, update and rollback.
- `docs/SITE-SPEC.md` — the GitHub Pages catalog: screens, index schema,
  search.
- `docs/COST-BASELINE.md` — cost/quality baseline and cost experiments.
- `docs/DEPENDENCY-GRAPH.md` — install-time and runtime graph of the plugins.
- `scripts/validate-marketplace.mjs` — custom CI structural checker.
- `scripts/release.mjs`, `scripts/rollback.mjs` — release/rollback helpers.

## CI

Every PR and push to `main` runs `.github/workflows/validate.yml`:
`node scripts/validate-marketplace.mjs`, `claude plugin validate .` (plus
`--strict` validation of `templates/example-plugin`), and a `gitleaks`
secret scan. See `docs/SECURITY.md` for what each layer covers.

**Branch protection (repo owner):** the `main` ruleset requires a pull
request and the `Validate Marketplace` status check. "Require review from
Code Owners" is enabled once there is a second maintainer — with a single
owner it would make every PR unmergeable (you cannot approve your own PR).

## License

MIT — see `LICENSE`.
