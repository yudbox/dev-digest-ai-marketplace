# Spec: Marketplace catalog on GitHub Pages | SPEC-2026-10-10-catalog-site | Status: draft
Supersedes: `docs/SITE-SPEC.md` (moved here and rewritten as a spec; includes a design handoff and mock data for UI design)
Related: [README](../../README.md), [CONTRIBUTING](../../CONTRIBUTING.md), [RELEASES](../RELEASES.md), [SECURITY](../SECURITY.md)

## Problem and why

The marketplace content — plugins, skills, agents, hooks, MCP servers — lives
in git as markdown and JSON files. To find an artifact, a person has to know
it exists and browse `plugins/**` on GitHub. There is nowhere to ask
"I need a skill for X".

A catalog on GitHub Pages gives one entry point: **find** an artifact by
keywords, **understand** what it does and what permissions it has, and
**install** it with one copy-paste.

**Key constraint.** GitHub Pages serves static files only — there is no
runtime backend. Two consequences shape the architecture:

1. **Search runs in the browser.** CI builds the index at build time and
   ships it as a static JSON file next to the app; the browser runs a fuzzy +
   keyword search (MiniSearch).
2. **"I need a skill for X" is not an LLM call at runtime.** An API key can't
   be put into public static files. v1 is fuzzy + keyword; semantic search via
   embeddings precomputed in CI is a possible upgrade, out of scope here.

## Goals / Non-goals

**Goals** (the 8 features of this spec):

| # | Feature | Priority |
|---|---|---|
| F1 | Search across all repository content, results as cards | P0 |
| F2 | **Copy install** button on every card | P0 |
| F3 | Detail view with deep link (`#/plugin/<name>`, `#/artifact/<id>`) | P0 |
| F4 | Browse + facets (type, keyword, author, plugin) | P1 |
| F5 | Command palette (Cmd/Ctrl+K) | P1 |
| F6 | What's new — release feed built from CHANGELOGs | P1 |
| F7 | Stats tile (how many plugins, skills, agents…) | P1 |
| F8 | Onboarding "how to connect the marketplace" with copy buttons | P1 |

Priority sets implementation order, not scope: P0 + P1 is the first release.

**Non-goals:**
- Any runtime backend, authentication, server-side state.
- Ratings, likes, comments, download counters — nowhere to store them.
- LLM at runtime; embeddings search (separate spec once the catalog grows).
- Editing content through the UI — the site only reads the repository; the
  source of truth is git + the PR flow (`CONTRIBUTING.md`).
- Dependency graph, curated collections, compatibility/health badges,
  JSON/RSS feed, popularity via the GitHub API — candidates for later specs.
- Special handling of old names from `renames` (redirects from old deep links).

## User stories

- As a developer, I want to type "skill for refactoring React" and see cards
  of matching artifacts, so I don't browse the repository by hand.
- As a developer, I want to copy the install command right from the card, so
  I can install a plugin in one step.
- As a developer, I want to open an artifact page and see its description,
  tools/permissions and dependencies before installing.
- As a developer who doesn't know what to search for, I want to browse the
  catalog by type and tags.
- As a keyboard-first developer, I want to open search with Cmd/Ctrl+K from
  any page.
- As a marketplace user, I want to see what was added or updated without
  watching git.
- As a new team member, I want to connect the marketplace in 30 seconds
  following step-by-step instructions with copy buttons.

## Acceptance criteria (EARS)

### Indexer and build

- **AC-1:** WHEN CI runs `scripts/build-index.mjs`, the system shall walk
  `.claude-plugin/marketplace.json` and every plugin with a relative `source`
  and write `site/public/index.json` with one entry per plugin, skill, agent,
  command, hook and MCP server.
  `observable: unit — fixture marketplace with 1 plugin (1 skill, 1 agent, hooks.json, .mcp.json with 1 server) → 5 entries with matching kinds`
- **AC-2:** The system shall write a top-level `schemaVersion` (integer) into
  `index.json`.
  `observable: unit — field present, type number`
- **AC-3:** IF `plugins` in `marketplace.json` is empty, THEN the system shall
  produce a schema-valid `index.json` with `items: []` and exit with code 0.
  `observable: unit — current repository state → exit 0, items = []`
- **AC-4:** IF the generated `index.json` fails schema validation, THEN the
  system shall exit `build-index.mjs` with a non-zero code and not publish
  the site.
  `observable: unit — entry missing a required field → exit ≠ 0, error names the entry id`
- **AC-5:** The system shall take a plugin's `version` from its `plugin.json`
  only.
  `observable: unit — fixture with version in plugin.json → entry has that version`
- **AC-6:** WHEN a plugin name is mapped to `null` in `renames`, the system
  shall not create an entry for it in `items`.
  `observable: unit — renames: { "old": null } → no "old" in items`

### F1 — Search and cards

- **AC-7:** WHEN the user types a query into the search field, the system
  shall show cards of matching entries, weighting fields
  `displayName`/`name` > `keywords` > `description` > `bodyText`.
  `observable: RTL — exact name match ranks above a bodyText-only match`
- **AC-8:** The system shall match entries by word prefix and with 1 typo in
  words of 5+ characters.
  `observable: unit — queries "refac" and "refactr" find an entry with keyword "refactoring"`
- **AC-9:** WHEN the query matches a card's name or description, the system
  shall highlight the match.
  `observable: RTL — <mark> around the match in the name`
- **AC-10:** A card shall show a kind badge, `displayName`, version (for
  plugins), a description of up to 2 lines, keywords, the parent plugin and
  the `Copy install` and `Open` buttons.
  `observable: RTL — card rendered from a fixture, all elements in the DOM`
- **AC-11:** IF the search returns no results, THEN the system shall show a
  "nothing found" message suggesting a simpler query, distinct from the
  empty-catalog state (AC-29).
  `observable: RTL — query without matches → no-results text, not empty-catalog text`
- **AC-12:** The system shall keep the query and facets in the URL
  (`#/search?q=&kind=&keyword=&author=&plugin=`) so results can be shared.
  `observable: RTL — typing updates the hash; opening the same hash restores query and facets`

### F2 — Copy install

- **AC-13:** WHEN the user clicks `Copy install` on a plugin card, the system
  shall copy `/plugin install <name>@dev-digest-ai-marketplace` to the
  clipboard and show "Copied ✓" for 2 s.
  `observable: RTL — mocked navigator.clipboard.writeText, argument and button text checked`
- **AC-14:** WHEN the user clicks `Copy install` on a skill, agent, command,
  hook or MCP card, the system shall copy the install command of the
  **parent** plugin and show on the card how to invoke the component after
  install: `/<plugin>:<skill>` for a skill or command, `<plugin>:<agent>` for
  an agent.
  `observable: RTL — card for skill "retro" of plugin "sdd-engineering" → copies install of sdd-engineering, shows /sdd-engineering:retro`
- **AC-15:** IF the Clipboard API is unavailable, THEN the system shall show
  the command in a pre-selected text field for manual copying.
  `observable: RTL — navigator.clipboard = undefined → field with the command, selected`

### F3 — Detail view

- **AC-16:** WHEN the user opens `#/plugin/<name>`, the system shall show
  `displayName`, version, author, `Copy install` and `View on GitHub`
  buttons, the rendered plugin `README.md`, its components as mini cards and
  its `dependencies`.
  `observable: RTL — fixture plugin → all sections in the DOM`
- **AC-17:** WHEN the user opens `#/artifact/<id>`, the system shall show the
  kind badge, name, a link to the parent plugin, the rendered `SKILL.md` or
  agent/command markdown, `tools` from frontmatter, `model` (if set) and the
  invocation.
  `observable: RTL — fixture agent with tools: Read, Grep → both tools visible`
- **AC-18:** The system shall load the markdown body for a detail view as a
  separate lazy request, not from the main `index.json`.
  `observable: network — home page fetches no bodies/*, opening a detail fetches exactly one file`
- **AC-19:** IF `<name>` or `<id>` from the URL is not in the index, THEN the
  system shall show a "not found" page with a link to search.
  `observable: RTL — #/plugin/does-not-exist → not-found text + link to #/search`

### F4 — Browse + facets

- **AC-20:** The system shall provide facets `kind`, `keyword`, `author`,
  `plugin` with an entry count next to each value.
  `observable: RTL — fixture with 2 skills and 1 agent → "skill (2)", "agent (1)"`
- **AC-21:** The system shall combine values of different facets with AND and
  values of the same facet with OR.
  `observable: unit — kind=skill+agent AND keyword=react → only skills/agents with keyword react`
- **AC-22:** WHILE the query is empty and at least one facet is selected, the
  system shall show all entries passing the facets (browse mode).
  `observable: RTL — empty query + kind=agent → all agents`

### F5 — Command palette

- **AC-23:** WHEN the user presses Cmd+K (macOS) or Ctrl+K (other OS) on any
  page, the system shall open a modal palette with focus in the search field.
  `observable: RTL — keydown Meta+K → dialog in the DOM, activeElement = input`
- **AC-24:** WHILE the palette is open, the system shall allow navigating
  results with arrow keys, opening a detail view with Enter and closing with
  Escape.
  `observable: RTL — ArrowDown, Enter → hash points to the second result's detail; Escape → dialog closed, focus restored`

### F6 — What's new

- **AC-25:** WHEN CI builds the index, the system shall produce
  `releases.json` from the `## [x.y.z] - YYYY-MM-DD` sections of all
  `plugins/*/CHANGELOG.md` and the root `CHANGELOG.md`, sorted newest first;
  the `[Unreleased]` section is excluded.
  `observable: unit — two CHANGELOGs with 3 releases and Unreleased → 3 entries in the right order`
- **AC-26:** The system shall show the 5 latest releases on the home page
  (plugin, version, date, first line of changes) and the full feed at
  `#/whats-new`.
  `observable: RTL — 7 releases in the fixture → 5 on home, 7 on #/whats-new`

### F7 — Stats tile

- **AC-27:** The system shall show on the home page the number of plugins,
  skills, agents, commands, hooks and MCP servers, counted from the index.
  `observable: RTL — fixture → numbers equal the entry count per kind`
- **AC-28:** WHEN the user clicks a number in the stats tile, the system shall
  open browse with the matching `kind` facet.
  `observable: RTL — click "agents" → hash #/search?kind=agent`

### F8 — Onboarding

- **AC-29:** WHILE the catalog is empty, the system shall show an empty state
  on the home page with calls to action pointing to `#/getting-started` and
  `CONTRIBUTING.md`.
  `observable: RTL — items = [] → empty-state text and both links`
- **AC-30:** The `#/getting-started` page shall contain steps with copy
  buttons consistent with `README.md`: `/plugin marketplace add
  yudbox/dev-digest-ai-marketplace`, `/plugin install
  <name>@dev-digest-ai-marketplace`, private repo access
  (`gh auth login && gh auth setup-git`), turning on auto-update,
  `/reload-plugins` after an update, and the JSON for a product repository's
  `.claude/settings.json`.
  `observable: RTL — every step has a copy button; manual — commands match README`
- **AC-31:** The system shall explain on `#/getting-started` the difference
  between `/plugin marketplace update` (refreshes the catalog) and
  `/plugin update` (updates an installed plugin). Each is shown in both
  forms — the slash command inside a Claude Code session and the terminal
  equivalent (`claude plugin marketplace update`, `claude plugin update`).
  `observable: manual — both commands, in both forms, with an explanation present`

### General

- **AC-32:** The system shall use hash routing (`#/…`) so every route works
  on GitHub Pages without rewrite rules.
  `observable: e2e — opening a #/plugin/<name> URL directly in a new tab renders the detail view`
- **AC-33:** IF the `schemaVersion` of the loaded `index.json` differs from
  the version the bundle was built with, THEN the system shall hard-reload the
  page once instead of parsing the index.
  `observable: RTL — mocked index.json with another schemaVersion → location.reload called exactly once`
- **AC-34:** The system shall render repository markdown only after
  sanitization: no `<script>`, inline event handlers or `javascript:` links.
  `observable: unit — README with <img src=x onerror=alert(1)> and [x](javascript:alert(1)) → no onerror and no javascript: href in the DOM`
- **AC-35:** The system shall support keyboard navigation across cards (Tab,
  Enter) and give kind badges a text contrast of at least 4.5:1.
  `observable: e2e — Tab reaches every card; axe check reports no contrast violations`

## Edge cases

- **Empty catalog** is the current state (`plugins: []`), not an edge case:
  AC-3 and AC-29 are required for the first release.
- **Plugin without `plugin.json`** — the repo validator forbids it; the
  indexer skips such a plugin with a warning instead of failing.
- **Hooks and MCP servers without a markdown description** — indexed by
  name, type and `parentPlugin`, without `bodyText` (see
  `[NEEDS CLARIFICATION]`).
- **Plugin with a non-relative `source`** (`github`, `git-subdir`…) — its
  files aren't in the repo: the entry is built from the `marketplace.json`
  entry fields only; components aren't indexed.
- **Query made only of filler words** ("I need a skill for") — results as for
  an empty query (browse), not "nothing found".
- **Very long markdown** — the detail view renders it in full; `bodyText` in
  the main index is truncated to 2000 characters.
- **Stale tab open during a deploy with a new schema** — AC-33.

## Data model / Schema

One index entry = one artifact; `kind` sets the type.

### `index.json`

| Field | Type | Description |
|---|---|---|
| `schemaVersion` | number | schema version (AC-2, AC-33) |
| `generatedAt` | string (ISO) | build time |
| `marketplace` | `{ name, description, owner }` | from `marketplace.json` |
| `items` | `IndexEntry[]` | entries |

### `IndexEntry` (shared fields)

| Field | Type | Description |
|---|---|---|
| `id` | string | stable key: `plugin:<name>` or `<kind>:<plugin>/<name>` |
| `kind` | enum | `plugin` \| `skill` \| `agent` \| `command` \| `hook` \| `mcp` |
| `name` | string | technical name (kebab-case) |
| `displayName` | string | manifest `displayName`, otherwise `name` |
| `description` | string | from manifest or frontmatter |
| `keywords` | string[] | tags for facets and search |
| `bodyText` | string? | markdown stripped of markup, up to 2000 characters |
| `bodyPath` | string? | path to the full markdown in `bodies/` for detail (AC-18) |
| `sourcePath` | string | path in the repo |
| `githubUrl` | string | link to the file/folder on GitHub |

### Extension for `kind: plugin`

| Field | Type | Description |
|---|---|---|
| `version` | string | from `plugin.json` (AC-5) |
| `author` | `{ name, email? }` | author |
| `installCommand` | string | `/plugin install <name>@dev-digest-ai-marketplace` |
| `sourceType` | enum | `path` \| `github` \| `url` \| `git-subdir` \| `npm` \| `archive` \| `command` |
| `dependencies` | string[] | dependency names from `plugin.json` |
| `components` | `{ skills, agents, commands, hooks, mcp }` | counters |

### Extension for components (`skill`, `agent`, `command`, `hook`, `mcp`)

| Field | Type | Description |
|---|---|---|
| `parentPlugin` | string | plugin `name`; that plugin is what gets installed |
| `invocation` | string? | `/<plugin>:<skill>` or `<plugin>:<agent>` (AC-14) |
| `tools` | string[]? | `tools:` / `allowed-tools:` from frontmatter |
| `model` | string? | `model:` from agent frontmatter |
| `hookEvents` | string[]? | for `hook`: events from `hooks.json` (PreToolUse, …) |

### Derived files

- `releases.json` — `{ plugin | "marketplace", version, date, summary, changelogUrl }[]` (AC-25).
- `stats.json` — counters per `kind` (AC-27); may be a field of `index.json`.
- `bodies/<id>.md` — full markdown bodies for detail views.

## Workflows

### Build and publish

```
push to main ──▶ pages.yml
                  1. node scripts/build-index.mjs
                       marketplace.json + plugins/** ──▶ index.json, releases.json,
                                                          stats.json, bodies/
                       schema validation (AC-4) ── fail ──▶ stop, no deploy
                  2. vite build ──▶ site/dist
                  3. actions/deploy-pages ──▶ GitHub Pages

pull_request ──▶ site-build.yml
                  steps 1–2 as a build check, no deploy, no secrets
```

Generated files (`site/public/index.json`, `releases.json`, `stats.json`,
`bodies/`, `site/dist/`) are never committed — they are already in
`.gitignore`; CI always rebuilds them from git.

### Search in the browser

```
page load ──▶ fetch index.json ──▶ check schemaVersion (AC-33)
          ──▶ MiniSearch builds the in-memory index (once)
typing ──▶ search(q) ──▶ facet post-filter (AC-21) ──▶ cards
click Open ──▶ #/plugin/<name> ──▶ lazy fetch bodies/<id>.md ──▶ sanitize ──▶ render
```

## Routes and screens

| Route | Screen |
|---|---|
| `#/` | Home: hero with search and popular keyword chips, stats tile, What's new (5), browse entry by `kind` |
| `#/search?q=&kind=&keyword=&author=&plugin=` | Search/browse results with facets |
| `#/plugin/<name>` | Plugin detail |
| `#/artifact/<id>` | Component detail |
| `#/whats-new` | Full release feed |
| `#/getting-started` | Onboarding |

Global: top bar (logo, search field, Cmd+K button, theme toggle), footer
(repository link, index `generatedAt`).

Artifact card:

```
┌──────────────────────────────────────────────────┐
│ [kind-badge]  displayName                v1.2.0   │
│ Short description, 2 lines, then ellipsis…        │
│ #keyword #keyword #keyword                        │
│───────────────────────────────────────────────────│
│ plugin · author             [Copy install] [Open] │
└──────────────────────────────────────────────────┘
```

## Design handoff

This section is for UI design. It lists every screen, the components on it
and the states each must cover.

### Audience and tone

Internal engineering team, developer-first. Expect keyboard use (Cmd/Ctrl+K,
Tab, arrows), monospace for commands, and dense-but-readable layouts — closer
to a developer docs site or package registry (npm, crates.io) than a
consumer app store. Desktop first; must not break at 360 px width.

### Visual requirements

- Light and dark theme, toggle in the top bar.
- Six kind badges with distinct colors, text contrast ≥ 4.5:1 in both themes:
  `plugin`, `skill`, `agent`, `command`, `hook`, `mcp`.
- Commands (install, invocation) always in monospace inside a copyable
  block; the copy button changes to "Copied ✓" for 2 s.
- Search-match highlight visible in both themes.
- Focus ring on every interactive element.

### Screens and states

| Screen | Components | States to design |
|---|---|---|
| Home `#/` | Hero search input with placeholder "Describe what you need — e.g. 'skill for refactoring React'", keyword chips, stats tile (6 clickable numbers), What's new list (5 items), browse buttons per kind | loaded · **empty catalog** (0 plugins — friendly message + CTAs "Get started" and "Add the first plugin") · loading (skeletons) · index failed to load |
| Search `#/search` | Search input, facet panel (kind, keyword, author, plugin with counts), live result count, card grid/list | results · no results ("Nothing found — try a simpler query") · facets selected with empty query (browse) · loading |
| Plugin detail `#/plugin/<name>` | Header (displayName, version badge, author, Copy install, View on GitHub), rendered README, components as mini cards, dependencies list | loaded · README loading · not found |
| Artifact detail `#/artifact/<id>` | Header (kind badge, name, "part of plugin X" link), rendered SKILL.md/agent markdown, tools list, model, invocation block, Copy install (parent plugin) | loaded · no description (hook/MCP) · not found |
| What's new `#/whats-new` | Chronological release list (plugin, version, date, summary, link to CHANGELOG) | loaded · no releases yet |
| Getting started `#/getting-started` | Numbered steps, each with a copyable command block; collapsible "Private repository access" and "Set up for the whole team" (JSON block) sections; note on `marketplace update` vs `plugin update` | single state |
| Command palette (overlay) | Modal with search input, keyboard-navigable result list (kind badge + name + parent plugin), footer hints (↑↓ navigate · Enter open · Esc close) | open with results · open, no results · open, empty query (recent/popular) |

### Reusable components

Top bar · footer · search input · kind badge · artifact card (full and mini)
· facet group with counts · copyable command block · stats tile · release
item · markdown viewer · empty state · not-found state · skeleton loader ·
toast/inline "Copied ✓" · command palette.

## Mock data for design

Illustrative content for mockups. It reflects the plugins planned for this
marketplace; names and descriptions are placeholders until the plugins are
written.

**Plugins**

| Plugin | Version | Components | Depends on |
|---|---|---|---|
| `sdd-engineering` — Spec-Driven Development: from a feature request to a verified implementation | 1.0.0 | agents `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`; skill `retro` (workflow retrospective) | `research-tools`, `architecture-review`, `engineering-paved-path` |
| `research-tools` — Research a topic, library or codebase area and return a cited summary | 1.0.0 | agent `researcher` | — |
| `architecture-review` — Review a change or design for architecture violations | 1.0.0 | agent `architecture-reviewer` | `engineering-paved-path` |
| `engineering-paved-path` — Shared engineering conventions reused by other plugins | 1.0.0 | shared skills (e.g. `zod`, `testing-conventions`) | — |

**Example cards**

```
[agent]  Spec Creator                          (sdd-engineering)
Turns a feature request into an EARS spec, asking blocking questions first.
#spec #ears #sdd
Invoke: sdd-engineering:spec-creator   [Copy install] [Open]

[skill]  Retro                                 (sdd-engineering)
Runs a workflow retrospective after a feature and records lessons learned.
#retro #workflow #sdd
Invoke: /sdd-engineering:retro         [Copy install] [Open]

[plugin] Research Tools                         v1.0.0
Research a topic, library or codebase area and return a cited summary.
#research #docs
/plugin install research-tools@dev-digest-ai-marketplace   [Copy install] [Open]
```

**Stats tile:** 4 plugins · 3 skills · 6 agents · 0 commands · 0 hooks · 0 MCP.

**What's new:** `sdd-engineering 1.0.0 — 2026-10-10 — Initial release: 4 agents and the retro skill`; `research-tools 1.0.0 — 2026-10-10 — Initial release`.

**Example queries:** "write a spec for a feature", "review architecture",
"research a library", "retro after release".

## Contracts (high-level)

The site has no API; the contract is the static files next to the bundle:

| File | Written by | Read by |
|---|---|---|
| `index.json` | `build-index.mjs` | search, browse, stats, detail headers |
| `releases.json` | `build-index.mjs` | What's new |
| `bodies/<id>.md` | `build-index.mjs` | detail view (lazy) |

Any incompatible change to `IndexEntry` bumps `schemaVersion`.

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite, TypeScript | component-based, typed `IndexEntry` |
| Search | MiniSearch | client-side fuzzy + prefix, small bundle |
| Routing | hash router | static hosting without rewrites (AC-32) |
| Markdown | `markdown-it` + DOMPurify | render + sanitize (AC-34) |
| Indexer | Node, built-in modules only | like `validate-marketplace.mjs`, no npm dependencies |

`validate.yml` stays free of npm dependencies; frontend npm dependencies live
only in `site-build.yml` / `pages.yml`, which never deploy code from fork PRs.
Actions are pinned to a major tag (`docs/SECURITY.md` → Supply-chain hygiene).

## Non-functional

- Search returns results within 50 ms on a 1000-entry index on a typical
  laptop.
- Main `index.json` up to 500 KB (gzip) for 1000 entries; markdown bodies
  live in `bodies/`.
- Mobile is secondary: the audience is mostly desktop + keyboard, but cards
  and search must not break at 360 px.
- Hash routing → no per-route OG tags: a `#/plugin/<name>` link shared in
  Slack unfurls with the home page tags. Acceptable for an internal tool.

## Inputs (provenance)

- `.claude-plugin/marketplace.json` — catalog, `renames`.
- `plugins/*/.claude-plugin/plugin.json` — version, author, dependencies.
- `plugins/*/skills/*/SKILL.md`, `agents/*.md`, `commands/*.md` — frontmatter and bodies.
- `plugins/*/hooks/hooks.json`, `plugins/*/.mcp.json` — hooks and MCP servers.
- `plugins/*/README.md`, `CHANGELOG.md`, root `CHANGELOG.md`.
- `README.md` — source of the onboarding commands (AC-30).

## Untrusted inputs

Plugin markdown and frontmatter are written by plugin authors and rendered
in the visitor's browser. Therefore:

- all markup is sanitized (AC-34);
- external links open with `rel="noopener noreferrer"`;
- the indexer never executes plugin code — it only reads files;
- frontmatter strings are rendered as text, never as HTML.

## Verification hints

- Unit: `build-index.mjs` on a fixture marketplace (`site/test/fixtures/`),
  including an empty catalog and `renames: null`.
- RTL: card, Copy install, facets, palette, empty state.
- E2E (Playwright against local `vite preview`): opening a deep link
  directly, keyboard navigation, axe check.
- Manual: deploying to Pages with the current empty catalog shows the empty
  state, not an error.

## [NEEDS CLARIFICATION]

- Hooks and MCP servers without a description (Edge cases): index by
  name/type only, or require a description in the plugin README?
- Who reviews the site code — the same catch-all CODEOWNERS (`@yudbox`) or a
  separate owner for `site/`?
- Schema validation of `index.json` (AC-4) — inside `build-index.mjs` or a
  separate step in `site-build.yml` / `pages.yml`?
- Domain: `yudbox.github.io/dev-digest-ai-marketplace` or a custom domain? If
  the repository is private, GitHub Pages needs a paid GitHub plan and the
  site is public unless access control is enabled (Enterprise).
