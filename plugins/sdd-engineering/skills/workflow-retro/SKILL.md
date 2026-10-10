---
name: workflow-retro
description: >
  Post-workflow retrospective for multi-agent sessions. Reconstructs the full
  agent sequence, measures cache efficiency / parallelism / cost, detects
  context duplication and gaps, and produces concrete actionable recommendations.
  Writes a one-row summary to the retro ledger (default docs/retros/ledger.md);
  full analysis goes to chat. Runs ONLY when the user explicitly asks for it.
  Trigger phrases: "workflow retro", "agent retro", "session retrospective",
  "/workflow-retro", "how did the workflow go", "retrospective", "recap agents",
  "what agents ran", "summarize the session", "workflow insights", "retro".
  Usage: /workflow-retro [ledger path]
keywords:
  - retrospective
  - cost
  - tokens
  - multi-agent
  - observability
---

# Workflow Retro Skill

> Post-mortem for any session where 2+ subagents ran.
> 3 phases: collect → analyse → recommend.
> Output: compact dashboard in chat + one ledger row appended to the ledger
> (`docs/retros/ledger.md` unless the user passes another path).
> **Runs only on explicit request** — never trigger it automatically at the end of
> another workflow.

---

## Invocation

```
/workflow-retro                         # ledger: docs/retros/ledger.md
/workflow-retro notes/retros.md         # custom ledger path
```

If fewer than 2 Agent tool calls are found in the session → output "Session too small for retro (< 2 agents). Skipping." and stop.

---

## Phase 1 — Collect

### 1a. Reconstruct agent sequence from conversation

Walk the conversation and collect every Agent tool call. Note for each:
- agent type (subagent_type)
- prompt summary (≤15 words)
- parallel with which other agent (if any)
- status: ✅ success / ⚠️ partial / ❌ failed
- depth: 1 = spawned by orchestrator, 2 = spawned by another agent

This sequence is used to determine depth and parallelism for the metrics table.

### 1b. Load pricing (daily cache)

Before any cost calculation, load current model prices:

Prices are cached per plugin installation in `${CLAUDE_PLUGIN_DATA}/model-prices.json`
(persistent plugin data dir — survives plugin updates). If `CLAUDE_PLUGIN_DATA`
is not set, keep prices in memory for this run only and do not write a cache file.

**Step 1.** Read `${CLAUDE_PLUGIN_DATA}/model-prices.json` if it exists.

**Step 2.** Check `fetched_at` timestamp:
- File exists AND `fetched_at` is less than 24h ago → use cached prices, skip to Step 5
- File missing OR older than 24h → proceed to Step 3

**Step 3.** WebFetch Anthropic's pricing page and parse rates for **every model id
that appears in the journal** (Phase 1c `model` fields): `input`, `output`,
`cache_read`, `cache_creation` (USD per million tokens).

**Step 4.** Write updated cache to `${CLAUDE_PLUGIN_DATA}/model-prices.json`:
```json
{
  "fetched_at": "2026-07-02T14:00:00Z",
  "<model-id>": {
    "input": 3.00,
    "output": 15.00,
    "cache_read": 0.30,
    "cache_creation": 3.75
  }
}
```

**Step 5.** If WebFetch or parse failed → use the last cached rates if any, otherwise
mark cost columns `N/A` and note:
`⚠️ Could not refresh prices — cost columns are estimates/N/A`

### 1c. Parse jsonl journal (always) — bundled script

Run the bundled, read-only parser (standard-library Python, no network, no writes):

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/analyze_journals.py"
# or, for a specific session:
python3 "${CLAUDE_SKILL_DIR}/scripts/analyze_journals.py" --session <session-id | path.jsonl>
```

It locates the current project's latest session transcript
(`~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`) and its subagent
transcripts (`<session-id>/subagents/agent-*.jsonl` + `.meta.json`) and prints JSON:

```json
{
  "session": {"id": "...", "model": "...", "in": 0, "out": 0, "cache_read": 0, "cache_creation": 0, "tools": 0, "span_s": 0},
  "agents": [
    {"id": "a5a41f1d", "role": "spec-creator", "depth": 1, "model": "...",
     "in": 80, "out": 2307, "cache_read": 3855447, "cache_creation": 41210,
     "tools": 37, "web_search": 0, "web_fetch": 0, "span_s": 7911,
     "first_ts": "...", "last_ts": "...", "interrupted": false, "description": "..."}
  ],
  "totals": {"agents": 7, "in": 0, "out": 0, "cache_read": 0, "cache_creation": 0,
             "tools": 0, "web_search": 0, "web_fetch": 0, "wall_s": 0, "parallelism": 0.14},
  "warnings": []
}
```

- Usage is de-duplicated per API message (one response is stored as several records).
- `depth` comes from the subagent's `spawnDepth`; `role` from its `agentType`.
- `interrupted: true` → the agent has no usage records → mark its token columns `N/A (interrupted)`
  and add `⚠️ Partial data — N agent(s) interrupted.`

If the script prints `"session": null` → output `⚠️ jsonl not found — token columns N/A, span/tools estimated from context` and fill those columns with `N/A`.

**Cost formula** (using prices from 1b):
```
cost = (in × prices.input + out × prices.output
      + cache_read × prices.cache_read
      + cache_creation × prices.cache_creation) / 1_000_000
```

**hit%**:
```
cache_read / (cache_read + cache_creation + in) × 100
```

**Parallelism factor** (`totals.parallelism` from the script):
```
sum(all agent spans) / wall-clock span of entire session
```

---

## Phase 2 — Analyse

### 2a. Context duplication

For each file that appears in 2+ agents' Read/Glob/Grep calls:
```
DUPLICATION: docs/architecture.md
  Read by: spec-creator (#1), implementation-planner (#2)
  Est. wasted tokens: ~3,000
  Fix: pass architecture summary from spec-creator output into implementation-planner prompt
```

### 2b. Round-trip count

Count per agent: how many times it issued a **clarification request** (re-asked the orchestrator for more context) OR **retried the same tool call** with the same arguments.
Additional Read/Grep calls for thorough research are NOT counted as round-trips.

```
round-trips: spec-creator=0, implementation-planner=1, implementer(backend)=2 ← HIGH
```
Any agent with round-trips ≥ 2 → flag as "under-briefed prompt".

### 2c. Delegation / scope drift

Check each agent invocation:
- Did the agent do work outside its documented scope?
- Did owned-paths in the plan match what was actually modified?

```
SCOPE DRIFT: implementer(backend) re-read SPEC and PLAN in full (3 Glob + 5 Read)
  Expected: receive owned paths + task list from orchestrator
  Fix: add owned-paths summary to implementer prompt in run-plan PHASE 1
```

### 2d. Toxic events

Any of:
- Terminal tool error (not retried successfully)
- `blocked-on-human` event
- Same tool call repeated 3+ times with same args

```
TOXIC: implementer(frontend) ran the typecheck command 3× before fixing import error
  Root cause: typecheck output not re-read after fix attempt 1
  Fix: implementer SKILL should re-read typecheck output before retry #2
```

### 2e. Gap detection

Bash IS ALLOWED here for read-only checks (diff, ls, find, grep). Write commands remain forbidden.

Check for missing steps:
- [ ] Insights recorded after substantive changes? (look for a `sdd-engineering:engineering-insights` call)
- [ ] Project-specific checks the repository documents (e.g. a contracts sync check in `CLAUDE.md`) — run them read-only if they exist
- [ ] Tests the plan required were actually added?
- [ ] Any AC from plan-verifier marked MISSING with no follow-up action?

Each gap:
```
GAP: engineering-insights skill not called after 6 files modified
  Risk: session discoveries not recorded for future agents
  Owner: orchestrator (run-plan Phase 4 or user)
  Fix: add engineering-insights call to run-plan PHASE 4 summary checklist
```

---

## Phase 3 — Recommend

Each recommendation must name a **specific agent or file** and contain **specific text** — no vague suggestions.

**Tier 1 — Agent prompt improvements** (highest ROI):
```
AGENT: implementation-planner.md
CHANGE: In STEP 0, add: "If a spec file exists for this plan, read it first and
  extract: affected modules, key constraints, existing patterns noted by spec-creator.
  Do NOT re-read files already summarised in the spec."
WHY: implementation-planner re-read docs/architecture.md independently (~3k wasted tokens)
```

**Tier 2 — Workflow structure** (medium ROI):
```
WORKFLOW: run-plan SKILL.md — Phase 1
CHANGE: After spawning parallel implementers, pass to each:
  "Files already read by spec-creator: <list>. Do not re-read these; use the PLAN summary instead."
WHY: 4 of 7 agents re-read the same architecture docs
```

**Tier 3 — Process / orchestration** (low-hanging fruit):
```
PROCESS: parallelism under-used (factor 0.82 < 1.5 threshold)
CHANGE: architecture-reviewer and plan-verifier can run in parallel —
  they read the same diff but produce independent outputs
```

---

## Output format

Output is a **compact dashboard** — no long narrative sections.

### Header (2 lines)

```
Workflow Retro — {short workflow name}
Run: {description} · {N} agents · mode: {single-fan-out|parallel|sequential} · prices: {refreshed HH:MM|hardcoded fallback}
```

### Metrics table

```
| agent    | role         | depth | in     | out    | cache-read  | hit% | tools | span  | cost  |
|----------|--------------|-------|--------|--------|-------------|------|-------|-------|-------|
| a00eb81a | spec-creator | 1     | 32,828 | 51,112 | 2,053,240   | 72%  | 20    | 1373s | $7.15 |
| L a14e0e4d | researcher | 2     | 51     | 8,027  | 1,913,785   | 93%  | 40    | 149s  | $1.24 |
| L a9873876 | researcher | 2     | 41     | 4,988  |   750,216   | 81%  | 24    | 96s   | $0.95 |
```

Column rules:
- `agent` — first 8 chars of subagent conversation ID (from jsonl)
- `role` — subagent_type
- `depth` — 1 = spawned by orchestrator; 2+ = spawned by another agent, prefix with `L ` (add extra space per level)
- `in` — `usage.input_tokens` summed across agent block
- `out` — `usage.output_tokens` summed across agent block
- `cache-read` — `usage.cache_read_input_tokens` summed across agent block
- `hit%` — `cache_read / (cache_read + cache_creation + in) × 100`; if < 60% → show as `49% ⚠️`
- `tools` — count of `tool_use` entries in agent block
- `span` — last timestamp minus first timestamp in agent block, in seconds
- `cost` — computed using prices from Phase 1b

If jsonl unavailable → fill `in`, `out`, `cache-read`, `hit%`, `cost` with `N/A`; fill `span` and `tools` from task notifications if available.

### Totals line

```
Totals: in: X · out: X · cache-read: XM · hit%: X% · tools: X · wall: Xs · parallelism: Xx · cost: $X · savings: ~$X · web: N search · N fetch
```

- `savings` = `cache_read_tokens × (prices.input - prices.cache_read) / 1_000_000` (how much cache saved vs uncached baseline)
- `web` — from `server_tool_use.web_search_requests` + `web_fetch_requests` in jsonl; omit entire `web:` segment if both are 0

### Critical path line

```
Critical path: {agent-role} / {agentId} ({X}% of wall) · {optional caveat}
```

### Analysis block (compact, only if findings exist)

```
Duplications (N): {file} read by {agentA}, {agentB} — est. waste: ~Xk tokens
Round-trips: {role}/{agentId}=N ⚠️ under-briefed
Scope drift: {one line}
Toxic: {one line}
Gaps (N): {one line each}
```

If no findings in a category → omit that line entirely.

### Action items (always last)

```
Action items:
- [ ] {specific file}: {specific change}  ← Tier 1
- [ ] {specific file}: {specific change}  ← Tier 2
- [ ] {specific action}                   ← Tier 3
```

Max 5 items. Each must name a specific file or owner.

---

### Ledger row (append to the ledger — default `docs/retros/ledger.md`)

After the dashboard output, append one row:

```
| {date HH:MM} | {workflow name} | {plan/spec name or "—"} | {N agents} | ~${cost} | {hit%} | {parallelism} | {bottleneck role/agentId} | {N duplications} | {N gaps} | {overall ✅/⚠️/❌} |
```

If the ledger file does not exist → create it (and its directory) with the header first.
This ledger row is the **only** file this skill writes.

---

## Rules

- **NEVER edit agent or skill files** — write recommendations only, never apply them
- **NEVER skip Phase 2** — duplication and gap analysis are the core value
- **ALWAYS parse jsonl via `${CLAUDE_SKILL_DIR}/scripts/analyze_journals.py`** — it is the single source of truth for token metrics
- **ALWAYS load prices from `${CLAUDE_PLUGIN_DATA}/model-prices.json`** before cost calculation; refresh if older than 24h
- **NEVER run without an explicit user request**
- **NEVER write vague recommendations** — every recommendation names a specific file and specific text
- **ALWAYS end with the Action items checklist** — ≤5 items, each assignable to a file
- **Append to ledger, never overwrite** — one new row per invocation
- **If < 2 agents ran** → "Session too small for retro (< 2 agents). Skipping." and stop
