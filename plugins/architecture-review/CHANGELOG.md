# Changelog — architecture-review

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); [SemVer](https://semver.org/). Release tags: `architecture-review--v<version>`.

**Last-known-good release:** _none yet — set when 1.0.0 is tagged and verified._

## [Unreleased]

## [1.0.0] - 2026-10-11

Release SHA: _filled in at tag time_

### Added
- Agent `architecture-reviewer` (read-only; Onion layering, DI discipline, SOLID; VIOLATION blocks + PASS/FAIL verdict), extracted from a product repository and generalized: STEP 0 builds the layer map from the target repository's own architecture docs, with a generic Onion fallback.
- Rule `documented-rule-violation` for explicit rules written in the repository's docs (replaces two product-specific rules).
- Dependency `engineering-paved-path@^1.0.0`; all skills referenced by namespaced name.
- Behavior evals (`evals/`) reusing the fixtures of `engineering-paved-path:onion-architecture`.
