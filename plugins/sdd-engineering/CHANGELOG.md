# Changelog — sdd-engineering

All notable changes to this plugin. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [SemVer](https://semver.org/). Release tags: `sdd-engineering--v<version>`.

**Last-known-good release:** _none yet — set when 1.0.0 is tagged and passes clean-install, upgrade and activation checks._

## [Unreleased]

## [1.0.0] - 2026-10-11

Release SHA: _filled in at tag time_

### Added
- Agents `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`, extracted from a product repository and generalized: no hardcoded paths, module names or commands — each agent discovers them from the target repository.
- Skill `run-plan` — orchestrates implementer(s) → `architecture-review:architecture-reviewer` fix loop → `plan-verifier`.
- Skill `workflow-retro` with bundled read-only `scripts/analyze_journals.py`, invoked via `${CLAUDE_SKILL_DIR}`; prices cached in `${CLAUDE_PLUGIN_DATA}`.
- Skill `engineering-insights` — module detection from the repository's own layout.
- Dependencies: `engineering-paved-path@^1.0.0`, `research-tools@^1.0.0`, `architecture-review@^1.0.0`; dependency components referenced by namespaced name.
- Behavior evals (`evals/`): positive, negative and workflow cases.

### Changed
- `plan-viewer` renamed to `plan-verifier`.
- `implementer` no longer calls a project-specific self-review skill; it reviews its own diff with `engineering-paved-path:security` and asks the user when no typecheck/test command is documented.
