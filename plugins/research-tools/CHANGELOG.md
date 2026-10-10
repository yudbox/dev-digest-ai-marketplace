# Changelog — research-tools

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); [SemVer](https://semver.org/). Release tags: `research-tools--v<version>`.

**Last-known-good release:** _none yet — set when 1.0.0 is tagged and verified._

## [Unreleased]

## [1.1.0] - 2026-10-11

Release SHA: _filled in at tag time_

### Added
- Every researcher report ends with a footer line `_research-tools v1.1.0_`,
  so you can see which plugin version produced it (used to verify that a
  marketplace update reached an installed plugin).

## [1.0.0] - 2026-10-11

Release SHA: _filled in at tag time_

### Added
- Agent `researcher` (read-only; project, web and mixed modes; table → Mermaid → notes output), extracted from a product repository and generalized: it now orients itself from the target repository's own docs and manifests instead of a hardcoded project map.
- Behavior evals (`evals/`).
