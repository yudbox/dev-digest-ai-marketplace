# example-plugin (template)

This is a **template**, not a registered plugin — it is never listed in the
root `.claude-plugin/marketplace.json`. It exists so new plugin authors have
a working, `claude plugin validate --strict`-clean starting point to copy
(validated on its own — the marketplace root is validated without
`--strict`, see `docs/SECURITY.md`).

## How to use this template

1. Copy this whole folder to `plugins/<your-plugin-name>/`.
2. Edit `.claude-plugin/plugin.json`: set `name` to your plugin's kebab-case
   name (must match the folder name), update `description`, `author`, etc.
3. Replace the placeholder files under `commands/`, `agents/`, `skills/`,
   `hooks/` with your real components, or delete the ones you don't need.
   Fill in `COMPATIBILITY.md`, `CHANGELOG.md` and the cases in `evals/`.
   Rewrite this README with the sections required by
   `docs/PLUGIN-GUIDELINES.md` (use case, components, requirements,
   installation, quick start, verification, support).
4. Add an entry for your plugin to the root `.claude-plugin/marketplace.json`
   `plugins` array, with `"source": "./plugins/<your-plugin-name>"`.
5. Bump the marketplace `version`.
6. Run `claude plugin validate .`, `claude plugin validate
   plugins/<your-plugin-name> --strict`, and
   `node scripts/validate-marketplace.mjs` locally before opening a PR.

See `docs/PLUGIN-GUIDELINES.md` for the full reference.

## Installation (replace with your plugin's name)

```
/plugin marketplace add yudbox/dev-digest-ai-marketplace
/plugin install example-plugin@dev-digest-ai-marketplace
```

## Notes on the example files

- `hooks/hooks.json` always references `${CLAUDE_PLUGIN_ROOT}` instead of an
  absolute path — installed plugins are copied into a versioned cache
  directory, so a hardcoded absolute path would break the moment the plugin
  is updated. This is one of the checks `scripts/validate-marketplace.mjs`
  enforces across the repo.
- `skills/example-skill/SKILL.md` is kept as plain Markdown + YAML
  frontmatter on purpose — no Claude-Code-specific syntax — so skills stay
  portable to other agent runtimes if you ever need that.
