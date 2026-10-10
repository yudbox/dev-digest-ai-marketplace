# Specs

Specifications for features of this marketplace repository, written in
English with **EARS** acceptance criteria. Every non-trivial feature starts with a spec —
before any plan or code.

## When to write a spec

Write one when a feature has user-facing behavior, touches more than one
file, or has open design questions. Skip it for typo fixes, pure refactors
and config changes.

## Naming

```
SPEC-YYYY-MM-DD-<kebab-case-feature-name>.md
```

Date = creation date and the ordering key (no numeric IDs). Feature name is
2–4 kebab-case words, e.g. `SPEC-2026-10-10-catalog-site.md`.

## Header

```
# Spec: <Title> | SPEC-YYYY-MM-DD-<name> | Status: draft
Supersedes: <spec or N/A>
Related: <links>
```

## Status lifecycle

```
draft  ->  approved  ->  implemented
```

- `draft` — open for review
- `approved` — confirmed before implementation starts
- `implemented` — live; the spec is frozen (changes go into a new spec that
  `Supersedes` it)

Status is updated manually in the header.

## Sections

`Problem and why` · `Goals / Non-goals` · `User stories` ·
`Acceptance criteria (EARS)` · `Edge cases` · `Data model / Schema` ·
`Workflows` · `Contracts (high-level)` · `Non-functional` ·
`Inputs (provenance)` · `Untrusted inputs` · `Verification hints` ·
`[NEEDS CLARIFICATION]`. Omit a section only if it truly doesn't apply.

## Acceptance criteria (EARS)

Every AC uses one of five patterns and ends with an `observable:` line saying
how it is checked.

| Pattern | Syntax |
|---|---|
| Ubiquitous | "The system shall …" |
| Event-driven | "WHEN \<event\>, the system shall …" |
| State-driven | "WHILE \<state\>, the system shall …" |
| Unwanted behavior | "IF \<condition\>, THEN the system shall …" |
| Optional feature | "WHERE \<feature is included\>, the system shall …" |

Vague language ("should work", "handle errors") is not allowed in ACs.

## Index

| Spec | Title | Status |
|---|---|---|
| SPEC-2026-10-10-catalog-site | [Marketplace catalog on GitHub Pages](SPEC-2026-10-10-catalog-site.md) | draft |
| SPEC-2026-10-11-sdd-plugin-family | [SDD plugin family (sdd-engineering + 3 dependencies)](SPEC-2026-10-11-sdd-plugin-family.md) | draft |

_Add a row here with every new spec._
