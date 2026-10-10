# Catalog site

A static, searchable catalog of the plugins, skills, agents, commands, hooks
and MCP servers in this marketplace. React + Vite + TypeScript, deployed to
GitHub Pages. No backend: search runs in the browser.

Spec: [`docs/specs/SPEC-2026-10-10-catalog-site.md`](../docs/specs/SPEC-2026-10-10-catalog-site.md).
Design: the "Marketplace catalog — UI" canvas in Claude Design.

## How the data gets onto the site

The site never reads the repository at runtime. Everything is prepared at
build time:

```
marketplace.json + plugins/**  ──▶  scripts/build-index.mjs  ──▶  site/public/
                                    (Node, no npm deps)            index.json      search index (one entry per artifact)
                                                                   releases.json   What's new, from every CHANGELOG
                                                                   bodies/**.md    README / SKILL.md / agent markdown,
                                                                                   fetched only when a detail page opens
site/public/ + src/  ──▶  vite build  ──▶  site/dist/  ──▶  GitHub Pages
```

In the browser, `index.json` is loaded once and MiniSearch builds an
in-memory index. It matches by prefix, tolerates one typo in words of 5+
letters, and ranks name > keywords > description > body text.

**What is indexed:** every plugin registered in
`.claude-plugin/marketplace.json` with a relative `./plugins/<name>`
source. For each plugin:

- `plugin.json` (version, description, author, keywords, dependencies);
- `skills/*/SKILL.md`;
- `agents/*.md` and `commands/*.md`;
- `hooks/hooks.json`, one entry per hook script;
- `.mcp.json` servers;
- `README.md`, rendered on the plugin page.

Releases are the `## [x.y.z] - YYYY-MM-DD` sections of each plugin's
`CHANGELOG.md` and of the root one.

**Not indexed:**

- folders that aren't registered in `marketplace.json`;
- plugins removed with `renames: { "<name>": null }`;
- `templates/`;
- files next to `SKILL.md` (`rules/`, `references/`, `scripts/`).

Plugins with a remote source (`github`, `url`…) get a card built from their
catalog entry only.

**Fields that make cards and filters useful:** `keywords` in `plugin.json`
and in each skill/agent frontmatter (keyword filter + search boost),
`displayName` in `plugin.json`, `description` everywhere, `tools` / `model`
in agent frontmatter.

`index.json`, `releases.json`, `bodies/` and `dist/` are generated and
git-ignored; CI rebuilds them from git every time.

## Where it is built

The site has its own workflows, separate from `Validate Marketplace`
(`validate.yml`, which checks the marketplace harness), so their results
show up as separate checks on GitHub:

| When | Workflow → jobs | What happens |
|---|---|---|
| Every pull request | `Catalog Site · CI` (`site-build.yml`) → `Site · test`, `Site · build` | tests, then index + typecheck + Vite build; no deploy, no secrets; the build job writes a summary (entry counts, file sizes) to the run page |
| Push to `main` (or manual run) | `Catalog Site · Deploy` (`pages.yml`) → `Site · test + build`, `Site · deploy to GitHub Pages` | the same build, then publish to GitHub Pages |

Adding a plugin needs no manual re-index: after the PR is merged, `pages.yml`
rebuilds the index and the plugin appears on the site within a couple of
minutes. `build-index.mjs` exits non-zero when the index fails schema
validation (for example a missing required field), which fails the PR check
and blocks the deploy.

### One-time GitHub Pages setup (repository owner)

1. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Push to `main` (or run "Deploy catalog site" from the Actions tab).
3. The URL is shown in the deploy job: `https://yudbox.github.io/dev-digest-ai-marketplace/`.

On a **private** repository GitHub Pages requires a paid plan, and the site
is public unless the organization has Enterprise access control.

The build uses relative asset paths (`base: "./"`) and hash routes
(`#/plugin/<name>`), so it works at any Pages path or custom domain without
rewrite rules.

## Local development

Requires Node 20+.

```bash
cd site
npm install
npm run dev        # index the real repository, then start Vite at http://localhost:5173
npm run dev:demo   # same, but with the demo catalog in test/fixtures/demo-marketplace
```

`dev` and `dev:demo` rebuild `public/index.json` once at start. After you
change a plugin, re-run `npm run index` (or `npm run index:demo`) and reload
the page.

| Command | What it does |
|---|---|
| `npm run index` / `npm run index:demo` | build `public/index.json`, `releases.json`, `bodies/` |
| `npm run build` / `npm run build:demo` | index + typecheck + production build into `dist/` |
| `npm run preview` | serve `dist/` locally, as GitHub Pages would |
| `npm test` | Vitest: indexer, search, markdown sanitizing, UI behaviour |
| `npm run typecheck` | `tsc --noEmit` |

## Layout

```
site/
  index.html            # fonts, theme bootstrap (no flash), root element
  vite.config.ts        # base "./", Vitest config
  src/
    main.tsx, App.tsx   # shell: top bar, routes, Cmd/Ctrl+K palette
    styles.css          # design tokens (light/dark) and all styles
    i18n/en.ts          # every UI string; components never hardcode copy
    lib/                # types, data loading, search, router, markdown, theme
    components/         # card, copy buttons, palette, badges, states
    pages/              # Home, Search, Plugin, Artifact, WhatsNew, GettingStarted
  test/                 # Vitest + Testing Library; fixtures/demo-marketplace
```

**UI text** (English only) lives in one file, `src/i18n/en.ts`; components
read it through `t` from `src/i18n` and never hardcode copy. Not in that
file on purpose: CLI
commands and identifiers (`src/lib/config.ts`, `pages/GettingStarted.tsx`),
which must match the root `README.md` exactly, and plugin data from
`index.json`.

## Security

Plugin markdown is rendered with raw HTML disabled and then sanitized with
DOMPurify: no scripts, no event handlers, no `javascript:` links, and
external links get `rel="noopener noreferrer"`. The indexer only reads files
and never runs plugin code.
