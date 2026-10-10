# Dependency graph — SDD plugin family

How the four plugins of this marketplace depend on and call each other.

## 1. Install time — who depends on whom

```mermaid
graph TD
  SDD["<b>sdd-engineering</b> · consumer<br/>agents: spec-creator · implementation-planner<br/>implementer · plan-verifier<br/>skills: run-plan · workflow-retro · engineering-insights<br/>+ evals, README, CHANGELOG, COMPATIBILITY"]
  EPP["<b>engineering-paved-path</b> · dep<br/>skills: react · next · frontend-architecture<br/>react-testing-library · fastify · drizzle<br/>postgresql · zod · typescript · security<br/>mermaid · onion-architecture"]
  RT["<b>research-tools</b> · dep<br/>agent: researcher (read-only)"]
  AR["<b>architecture-review</b> · dep<br/>agent: architecture-reviewer (generalized, read-only)"]

  SDD -->|"^1.0.0"| EPP
  SDD -->|"^1.0.0"| RT
  SDD -->|"^1.0.0"| AR
  AR -->|"^1.0.0"| EPP
```

`/plugin install sdd-engineering@dev-digest-ai-marketplace` installs all
four: the resolver walks `dependencies`, finds tags
`{name}--v{version}` matching `^1.0.0`, installs the highest match.
`engineering-paved-path` is needed twice (by `sdd-engineering` and
`architecture-review`) — it is installed **once**, at the highest version
satisfying both ranges.

## 2. Runtime — how the consumer calls its dependencies (namespaced)

```mermaid
graph LR
  U(("user")) --> SC["spec-creator"]
  U --> IP["implementation-planner"]
  U --> RP["/run-plan"]
  U -. "explicit only" .-> WR["/workflow-retro"]

  SC -->|"Agent"| R["research-tools:researcher"]
  IP -->|"Agent"| R
  SC -->|"skills"| EPPS["engineering-paved-path:&lt;skill&gt;"]
  IP -->|"skills"| EPPS

  RP -->|"phase 1"| IM["implementer"]
  IM -->|"skills"| EPPS
  RP -->|"phase 2 · fix loop"| ARV["architecture-review:architecture-reviewer"]
  ARV -->|"skills"| EPPS
  RP -->|"phase 3 · report"| PV["plan-verifier"]

  SC -->|"writes"| SPEC[["specs/SPEC-*.md"]]
  IP -->|"reads spec, writes"| PLAN[["plans/PLAN-*.md"]]
  RP -->|"reads"| PLAN
  WR -->|"appends"| LEDGER[["docs/retros/ledger.md"]]
```

Own components (`spec-creator`, `plan-verifier`, `run-plan`, …) are
called by their plain names inside the plugin; components of a
**dependency** are always called by `<plugin>:<component>`.

## 3. Build / release order

```mermaid
graph LR
  A["1 · engineering-paved-path<br/>skills only — mostly copy as is"] --> C
  B["2 · research-tools<br/>researcher — almost as is"] --> D
  C["3 · architecture-review<br/>generalize architecture-reviewer"] --> D
  D["4 · sdd-engineering<br/>4 agents + 3 skills, declares 3 deps"]
```

`engineering-paved-path` and `research-tools` have no dependencies and
can be built in parallel; `architecture-review` needs
`engineering-paved-path`; `sdd-engineering` is always last. Tags follow
the same order: `engineering-paved-path--v1.0.0` →
`research-tools--v1.0.0` → `architecture-review--v1.0.0` →
`sdd-engineering--v1.0.0`.
