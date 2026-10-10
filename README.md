# dev-digest-ai-marketplace

[![Validate Marketplace](https://github.com/yudbox/dev-digest-ai-marketplace/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/yudbox/dev-digest-ai-marketplace/actions/workflows/validate.yml)
[![Catalog Site · Deploy](https://github.com/yudbox/dev-digest-ai-marketplace/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/yudbox/dev-digest-ai-marketplace/actions/workflows/pages.yml)

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

Then install a plugin by `<plugin>@dev-digest-ai-marketplace`.

### Things to know before you install

- **Access to a private repo.** Claude Code runs `git` on your machine
  without prompts and uses only credentials already stored there. Either
  load a GitHub SSH key into `ssh-agent`, or store an HTTPS credential:
  `gh auth login && gh auth setup-git`. A `GITHUB_TOKEN` in the
  environment alone is **not** enough. Without an SSH key, set
  `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` to skip the SSH probe.
- **Auto-update is off** for third-party marketplaces. Turn it on in
  `/plugin` → **Marketplaces** → `dev-digest-ai-marketplace` → **Enable
  auto-update**, or update manually with
  `claude plugin update <plugin>@dev-digest-ai-marketplace`.
- **Updates apply after reload.** Run `/reload-plugins` or start a new
  session — hooks and MCP servers keep the old version until then.

### Enable for everyone in a product repository

Commit this to the product repository's `.claude/settings.json`
(or run `claude plugin marketplace add yudbox/dev-digest-ai-marketplace
--scope project` there once). It applies to each teammate after they
accept the workspace trust dialog for that folder:

```json
{
  "extraKnownMarketplaces": {
    "dev-digest-ai-marketplace": {
      "source": { "source": "github", "repo": "yudbox/dev-digest-ai-marketplace" }
    }
  },
  "enabledPlugins": {
    "<plugin>@dev-digest-ai-marketplace": true
  }
}
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
- `docs/specs/` — feature specs (`SPEC-YYYY-MM-DD-<name>.md`, EARS
  acceptance criteria); e.g. the GitHub Pages catalog:
  `SPEC-2026-10-10-catalog-site.md`.
- `docs/COST-BASELINE.md` — cost/quality baseline and cost experiments.
- `docs/DEPENDENCY-GRAPH.md` — install-time and runtime graph of the plugins.
- `scripts/validate-marketplace.mjs` — custom CI structural checker.
- `scripts/smoke-install.mjs` — isolated add → install → list check.
- `scripts/release.mjs`, `scripts/rollback.mjs` — release/rollback helpers.
- `scripts/build-index.mjs` — builds the catalog site's search index from
  the plugins (see "Catalog site").
- `site/` — the catalog site (React + Vite), deployed to GitHub Pages; see
  `site/README.md`.

## CI

Every PR and push to `main` runs `.github/workflows/validate.yml`:
`node scripts/validate-marketplace.mjs` (with a version-bump check against
the base branch on PRs), `claude plugin validate` (pinned CLI version;
`--strict` for the template and every plugin), `node
scripts/smoke-install.mjs` (add → install → list in an isolated config),
and a `gitleaks` secret scan. See `docs/SECURITY.md` for what each layer
covers.

**Branch protection (repo owner):** the `main` ruleset requires a pull
request and the `Validate Marketplace` status check; add
`Site · test` and `Site · build` as required checks too, so a change that
breaks the catalog can't be merged. "Require review from
Code Owners" is enabled once there is a second maintainer — with a single
owner it would make every PR unmergeable (you cannot approve your own PR).

## Catalog site

A searchable catalog of everything in this marketplace is published to
GitHub Pages: `https://yudbox.github.io/dev-digest-ai-marketplace/`.
Its CI is separate from the marketplace checks, so the two show up as
different checks on GitHub:

| Workflow | Runs on | Jobs (as shown on GitHub) |
|---|---|---|
| `Validate Marketplace` (`validate.yml`) | every PR, push to `main` | `validate`: the marketplace harness — manifests, plugins, smoke install, secrets |
| `Catalog Site · CI` (`site-build.yml`) | every PR | `Site · test` → `Site · build` (no deploy) |
| `Catalog Site · Deploy` (`pages.yml`) | push to `main` | `Site · test + build` → `Site · deploy to GitHub Pages` |

A merged plugin appears on the site without any manual step: the deploy
rebuilds the index from git. Local development, data flow and the one-time Pages setup are in
`site/README.md`; the spec is `docs/specs/SPEC-2026-10-10-catalog-site.md`.

## License

MIT — see `LICENSE`.
