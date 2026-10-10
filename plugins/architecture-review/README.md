# Architecture Review

A **read-only architecture reviewer** for Claude Code. It checks layering,
dependency direction, DI discipline and SOLID on a module, a set of files or
a diff, and reports structured, evidence-based violations with a single
`PASS` / `FAIL` verdict. It never edits code.

## Use case

- Before merge: "architecture audit of this branch".
- On a new module: "review the architecture of the billing module".
- As the review gate of [`sdd-engineering`](../sdd-engineering/README.md):
  `/run-plan` calls it on the diff since the implementation started and
  loops fixes until no CRITICAL/HIGH remain (max 3).

## Components

| Component | Description |
|---|---|
| agent `architecture-review:architecture-reviewer` | STEP 0 builds a **layer map of the current repository** from its own docs (`CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, `docs/architecture*.md`, ADRs); if none exist it uses the generic Onion map and says so. Then collects imports, applies the rule table and SOLID checks, and reports. |

### Rules it reports (and only these)

| Rule ID | Meaning |
|---|---|
| `inward-only-dependencies` | a file imports from an outer layer |
| `di-discipline` | `new ConcreteAdapter()` outside the composition root |
| `no-business-logic-in-routes` | branching business logic in a route/controller |
| `srp-violation` · `ocp-violation` · `lsp-violation` · `isp-violation` | SOLID |
| `documented-rule-violation` | breaks an explicit rule from the repository's own architecture docs (quoted as evidence) |

Output per finding: `VIOLATION [SEVERITY]`, `File: path:line`, `Rule`,
`Evidence`, `Fix`. Summary with counts by severity, the layer map it used,
and `Verdict: PASS|FAIL` (FAIL if any CRITICAL or HIGH). Design opinions that
don't match a rule go to "Observations" and never change the verdict.

### Skills it uses (from the dependency)

Preloaded: `engineering-paved-path:onion-architecture`,
`engineering-paved-path:typescript-expert`, `engineering-paved-path:security`.
Loaded on demand at file-type checkpoints: `fastify-best-practices`,
`drizzle-orm-patterns`, `zod`, `postgresql-table-design`,
`frontend-architecture`, `next-best-practices`, `react-best-practices` (all
`engineering-paved-path:*`). Checkpoints for technologies the repository
doesn't use are skipped.

## Dependencies

| Plugin | Range | Why |
|---|---|---|
| [`engineering-paved-path`](../engineering-paved-path/README.md) | `^1.0.0` | the reviewer's rulebook — Onion layer rules and the stack-specific skills above. Installed automatically. |

## Requirements

| | |
|---|---|
| Claude Code | **≥ 2.1.110** (version-constrained dependency) |
| Tools | `Read, Grep, Glob, Bash, Skill` |
| Write access | **none** |
| Network | none |
| Secrets | none |

## Installation

```
/plugin marketplace add yudbox/dev-digest-ai-marketplace
/plugin install architecture-review@dev-digest-ai-marketplace
```

`engineering-paved-path` is installed with it. Project scope: add
`--scope project` (CLI form `claude plugin …`). Installing `sdd-engineering`
installs this plugin automatically.

## Quick start

```
review the architecture of src/modules/orders
```

or, for a branch:

```
architecture review of the diff against main
```

Expected: a `Layer map:` block, zero or more `VIOLATION` blocks, the summary,
and a last line `Verdict: PASS` or `Verdict: FAIL`.

**Tip:** write your layer rules down in `CLAUDE.md` or
`docs/architecture.md` ("`packages/core` must not do I/O", "only
`src/container.ts` may call `new` on adapters") — the reviewer enforces
documented rules as `documented-rule-violation`.

## Verification

1. `/agents` lists `architecture-review:architecture-reviewer`.
2. Run it on a file where a service imports `drizzle-orm` directly → one `inward-only-dependencies` violation, `Verdict: FAIL`.
3. Run it on a clean module → `✅ No architectural violations found…`, `Verdict: PASS`.

Cases: [`evals/`](evals/README.md).

## Support

Owner: @yudbox · backup: _not assigned yet_ · bugs: [GitHub issues](https://github.com/yudbox/dev-digest-ai-marketplace/issues) (label `architecture-review`) · versions: [`CHANGELOG.md`](CHANGELOG.md) · [`COMPATIBILITY.md`](COMPATIBILITY.md)
