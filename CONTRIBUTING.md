# Contributing

Thin entry point for contributors — the deep reference docs live under
`docs/`; this file is the workflow overview and links out to them. Goal:
you can open a correct pull request without asking anyone where files go
or what to run.

## General rules

- **Naming**: every `name` (marketplace and plugins) is kebab-case, no
  spaces. A plugin's `name` is public and effectively permanent once
  published — renaming it breaks existing user installs. Change
  `displayName` for a cosmetic label; use the `renames` map in
  `marketplace.json` for an actual rename/removal (see `docs/RELEASES.md`).
- **No secrets, no absolute paths** in any manifest or component. A
  manifest may *name* a secret slot (e.g. an expected env var) but never
  contain a credential value. Absolute paths (`/Users/...`, `/home/...`)
  are forbidden — use `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_SKILL_DIR}` or
  `${CLAUDE_PLUGIN_DATA}` instead (see `docs/PLUGIN-GUIDELINES.md` → Paths
  and `docs/SECURITY.md`).
- **Don't escape the plugin's own directory via `../`** — installed
  plugins are copied into a cache directory, and anything outside the
  plugin folder won't come along.
- **No project-specific content.** Paths, module names and rules of one
  product repository stay in that repository.
- **Never push directly to `main`.** Every change, including releases,
  goes through a pull request.

## Required plugin structure

See `docs/PLUGIN-GUIDELINES.md` for the full reference. Minimum:

```
plugins/<name>/
├── .claude-plugin/plugin.json   # name, version, description, author (+ dependencies)
├── evals/                       # positive, negative and workflow cases
├── README.md                    # use case, components, requirements, install, verify, support
├── CHANGELOG.md
└── COMPATIBILITY.md
```

## Dependency rules

- Declare plugin-to-plugin dependencies in `plugin.json` → `dependencies`
  with a semver range: `{ "name": "engineering-paved-path", "version": "^1.0.0" }`.
- Reference a dependency's skills/agents by **namespaced name**
  (`engineering-paved-path:zod`, `research-tools:researcher`) — never copy
  them into your plugin.
- A dependency must already have a release tag
  (`{name}--v{version}`) matching your range before your plugin is
  released. Release order: dependencies first, consumer last
  (`docs/RELEASES.md` → Dependency order).

## Adding or changing a plugin

1. Create a branch: `feat/<plugin>-<change>` or `release/<plugin>-<version>`.
2. If this is a **new** plugin: copy `templates/example-plugin/` to
   `plugins/<name>/` and edit `.claude-plugin/plugin.json`, then add an
   entry to the root `.claude-plugin/marketplace.json` `plugins` array:
   `{ "name": "<name>", "source": "./plugins/<name>" }`.
   > Editing the catalog is **only** needed when adding/removing a plugin.
   > Bumping an existing plugin's own version happens in its `plugin.json`
   > and does not touch `marketplace.json` (see `docs/RELEASES.md`).
3. If this is a new plugin author, add them to `CODEOWNERS`:
   `plugins/<name>/ @their-github-handle`.
4. Add or update `evals/` cases for the behavior you changed.
5. Update the plugin's `CHANGELOG.md` and the root `CHANGELOG.md` — see
   `docs/RELEASES.md` for the full release process and the version-bump
   gotcha.
6. Validate locally before opening a PR:
   ```
   node scripts/validate-marketplace.mjs
   claude plugin validate .
   claude plugin validate plugins/<name> --strict
   ```
7. Smoke-test the plugin loaded straight from your working tree, together
   with its dependencies:
   ```
   claude --plugin-dir ./plugins/<dependency> --plugin-dir ./plugins/<name>
   ```
   Run the plugin's positive and negative eval cases in that session.
8. Open the PR and fill in the checklist. CI
   (`.github/workflows/validate.yml`) must be green.

## Pull request checklist

Copied into every PR by `.github/PULL_REQUEST_TEMPLATE.md`:

- [ ] Validation passes locally (step 6 above)
- [ ] Behavior evals run — old and new cases, results in the PR description
- [ ] No secrets, no absolute paths, nothing outside the plugin directory
- [ ] Dependencies declared with ranges; dependency components referenced by namespaced name
- [ ] Permission changes (agent `tools:`, hooks, MCP servers) listed in the PR description
- [ ] `version` bumped in `plugin.json` if this changes shipped behavior
- [ ] Plugin `CHANGELOG.md` + root `CHANGELOG.md` updated
- [ ] `CODEOWNERS` updated if this adds a new plugin author

## Review & release

- Changes to an **existing** plugin are reviewed by that plugin's owner
  (per `CODEOWNERS`).
- **Adding a new plugin** to the catalog is approved by the repo's
  maintainers (the catch-all `CODEOWNERS` entry), not just the new
  plugin's own author — it's a change to the shared marketplace index,
  not just to one plugin's folder.
- `CODEOWNERS` only *requests* a review; blocking merge without it needs
  the "Require review from Code Owners" rule in the `main` branch ruleset.
- Release process (SemVer, tags, channels, rollback): `docs/RELEASES.md`.
- Permissions, secrets policy, unsafe-release response: `docs/SECURITY.md`.
