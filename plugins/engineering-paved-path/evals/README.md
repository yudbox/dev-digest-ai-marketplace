# engineering-paved-path — behavior evals

Load with `claude --plugin-dir <marketplace>/plugins/engineering-paved-path`.

| ID | Kind | Input | Expected skill | Pass |
|---|---|---|---|---|
| P1 | positive | `where does a Drizzle query belong in an onion-architecture backend?` | `onion-architecture` | skill loaded; answer: infrastructure / repository |
| P2 | positive | `can I use useState in a Server Component?` | `next-best-practices` | skill loaded; answer: no, needs `'use client'` |
| P3 | positive | `validate this request body with Zod and return 422 on failure` | `zod` | skill loaded; uses `safeParse` |
| P4 | positive | `review this login handler for OWASP issues` | `security` | skill loaded; findings reference OWASP categories |
| P5 | positive | `draw a sequence diagram of the checkout flow` | `mermaid-diagram` | skill loaded; output is a fenced `mermaid` block |
| P6 | positive | `run a TypeScript health check on this project` | `typescript-expert` | runs `python3 "${CLAUDE_SKILL_DIR}/scripts/ts_diagnostic.py"` — path resolves |
| N1 | negative | `summarize this CHANGELOG` | none | no paved-path skill loaded |
| N2 | negative | `write a haiku about autumn` | none | no paved-path skill loaded |

`onion-architecture` has its own fixture-based eval in `skills/onion-architecture/evals/` (6 fixtures, `expected-findings.json`), consumed by `architecture-review`.
