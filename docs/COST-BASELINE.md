# Cost Baseline

Cost and quality baseline for the fixed SDD scenario, plus the record of
each cost experiment. Optimizations are accepted only if the quality gate
stays green — saving 30% while missing a blocker is a regression, not a
win.

## Scenario

> **Status:** not measured yet — filled in during lab step 8, after
> `sdd-engineering` and its dependencies are buildable.

- **Workflow:** user asks for a spec and a plan for a small feature
  (`spec-creator` → `implementation-planner`).
- **Input:** _TBD — fixed feature request text, committed under
  `plugins/sdd-engineering/evals/`_.
- **Eval set:** _TBD — case IDs and their acceptance criteria_.
- **Runs per configuration:** ≥ 3, same model, same eval set.

## What we record per configuration

| Field | Source |
|---|---|
| Plugin + version, marketplace commit SHA | `claude plugin list --json`, `git rev-parse HEAD` |
| Model | session config |
| Input / output / cache-read / cache-write tokens | OpenTelemetry `claude_code.token.usage` or session `/cost` |
| API calls, tool calls, retries, errors | `claude_code.api_request` events / transcript |
| Wall-clock latency | run timestamps |
| Estimated cost (USD) | `claude_code.cost.usage` (estimate — provider billing is the source of truth) |
| Pass rate, critical false negatives | eval results |

Report **median and p95** for cost and latency, and always show the
denominator next to a rate. Compare cost **per successful run**, not per
run: $0.08 at 40% success is worse than $0.12 at 95%.

## Baseline

| Metric | Value |
|---|---|
| sdd-engineering version / SHA | |
| Model | |
| Runs | |
| Pass rate (n/N) | |
| Critical false negatives | |
| Median / p95 cost | |
| Median / p95 latency | |
| Median input / output / cache tokens | |
| Median API calls / tool calls / retries | |
| Cost per successful run | |

## Experiment log

One lever per experiment — do not change model, prompt and routing at the
same time.

### Experiment 1 — _TBD_

- **Lever changed:** _e.g. remove instructions duplicated between agent
  prompts and skills; keep detail in skill references loaded on demand_
- **Hypothesis:**
- **Result:** (same table as Baseline)
- **Quality gate:** pass rate ≥ baseline, no new critical false negatives
- **Decision:** accepted / rejected / within noise — _say so honestly if
  the difference is within run-to-run variance_
