# Changelog

All notable changes to this marketplace are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

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
