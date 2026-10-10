# Changelog — engineering-paved-path

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); [SemVer](https://semver.org/). Release tags: `engineering-paved-path--v<version>`.

**Last-known-good release:** _none yet — set when 1.0.0 is tagged and verified._

## [Unreleased]

## [1.0.0] - 2026-10-11

Release SHA: _filled in at tag time_

### Added
- Twelve skills: react-best-practices, next-best-practices, frontend-architecture, react-testing-library, fastify-best-practices, drizzle-orm-patterns, postgresql-table-design, onion-architecture, zod, typescript-expert, security, mermaid-diagram.
- `keywords` in every skill's frontmatter (catalog search and facets).
- `typescript-expert`: bundled `scripts/ts_diagnostic.py` now referenced via `${CLAUDE_SKILL_DIR}`.

### Changed
- `onion-architecture` generalized: product-specific paths (`server/src/…`, `vendor/shared/contracts`) replaced by a reference layout (`src/modules`, `src/contracts`, `src/platform/container.ts`) that the skill maps onto the target repository's documented layout first; eval fixtures updated accordingly.
- `frontend-architecture`: product package name in an import example replaced with a placeholder (`@acme/shared`).
