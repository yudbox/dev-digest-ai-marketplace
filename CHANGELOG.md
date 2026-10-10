# Changelog

All notable changes to this marketplace are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `research-tools` 1.1.0: researcher reports end with a version footer
  (`_research-tools v1.1.0_`).
- Initial marketplace skeleton: `.claude-plugin/marketplace.json` (empty
  `plugins: []`), `templates/example-plugin/` starter template, CI
  validation (`claude plugin validate` + custom structural checker +
  gitleaks), and contributor docs under `docs/`.
- Release docs: `{plugin}--v{version}` tag convention (used by Claude Code's
  dependency resolver), dependency release order, `latest`/`stable`
  release channels and the rollback procedure (`docs/RELEASES.md`);
  `scripts/release.mjs` / `rollback.mjs` emit `--v` tags.
- `docs/SECURITY.md`: review-before-approval checklist and the response
  to an unsafe release (revocation, persistence cleanup, credential
  rotation).
- `docs/PLUGIN-GUIDELINES.md`: plugin boundary rules, required files
  (`evals/`, `README.md`, `CHANGELOG.md`, `COMPATIBILITY.md`),
  dependencies and namespaced references, `${CLAUDE_SKILL_DIR}`.
- `docs/COST-BASELINE.md` template for the cost/quality baseline.
- Generated catalog files and `site/dist/` are git-ignored.
- Plugins `engineering-paved-path`, `research-tools`, `architecture-review`
  and `sdd-engineering` at 1.0.0 (unreleased — no tags yet), registered in
  `marketplace.json`; extracted from the Dev Digest harness and
  generalized (no product-specific paths). Spec:
  `docs/specs/SPEC-2026-10-11-sdd-plugin-family.md`; graph:
  `docs/DEPENDENCY-GRAPH.md`.
- `scripts/smoke-install.mjs`: add → install → list of the marketplace in
  an isolated `CLAUDE_CONFIG_DIR` (template stands in while the catalog is
  empty); runs in CI.
- `scripts/validate-marketplace.mjs`: full official reserved-name lists
  (marketplace and plugin rules), `version` forbidden in catalog entries,
  required `version`/`description`/`author` and plugin files, `./` and
  `..` checks on sources, `renames` chain check, `CODEOWNERS` coverage per
  plugin, `--base <ref>` version-bump check, warnings for plugin-root
  `CLAUDE.md` and `bin/`; the template is held to the per-plugin rules.
- README: private-repo access, auto-update, reload and project-scope
  setup for users.
- Catalog site (`site/`, React + Vite + TypeScript) per
  `SPEC-2026-10-10-catalog-site`. Features:
  - in-browser search (MiniSearch) with facets;
  - Copy install on every card;
  - plugin and artifact detail pages with lazily loaded markdown;
  - Cmd/Ctrl+K palette;
  - What's new feed and stats;
  - onboarding page;
  - light/dark themes.
  `scripts/build-index.mjs` builds `index.json`, `releases.json` and
  `bodies/` from the plugins and validates the index schema.
  `pages.yml` deploys the site to GitHub Pages on push to `main`;
  `site-build.yml` runs the same tests and build on pull requests.
  `npm run dev` / `dev:demo` serve it locally.

### Changed

- `docs/SITE-SPEC.md` moved to `docs/specs/SPEC-2026-10-10-catalog-site.md`
  and rewritten as an EARS spec scoped to 8 features (search + cards, copy
  install, detail view, browse + facets, Cmd/Ctrl+K, What's new, stats,
  onboarding); `docs/specs/README.md` holds the spec conventions and index.
- CI: `permissions` reduced to `contents: read` / `pull-requests: read`,
  Claude Code CLI pinned (`CLAUDE_CODE_VERSION`), Node set up before the
  custom checker, every `plugins/*/` validated with `--strict`.
- Template: dropped `commands/` (new plugins use skills); the README no
  longer asks to bump the marketplace version when adding a plugin.

### Fixed

- `docs/RELEASES.md`, `docs/SECURITY.md`: removing a
  plugin now follows the official mechanism (`renames: { name: null }` +
  `forceRemoveDeletedPlugins`) instead of a "deprecated" note, which
  Claude Code doesn't recognize.
- `docs/RELEASES.md`: a relative-path dependency without a matching tag
  installs the marketplace copy and is range-checked at load (it does not
  fail the install); `version` must be set in `plugin.json` only.
- `docs/PLUGIN-GUIDELINES.md`: `${CLAUDE_SKILL_DIR}` resolves only in
  skill content, not in hooks/MCP config.
- `scripts/release.mjs --plugin` no longer moves the root CHANGELOG's
  `[Unreleased]` (entries of every plugin) under one plugin's version; it
  cuts only that plugin's CHANGELOG and warns when it has no notes.
- `scripts/rollback.mjs` restores the plugin folder with `git restore`, so
  files added after the target ref are removed instead of shipped with
  the rollback.
