## What changed and why

## Checklist

See `CONTRIBUTING.md` for details on each item.

- [ ] `node scripts/validate-marketplace.mjs --base origin/main` passes locally
- [ ] `claude plugin validate .` passes locally (plus `claude plugin validate plugins/<name> --strict` and `node scripts/smoke-install.mjs`)
- [ ] Plugin name(s) are kebab-case and unique
- [ ] No secrets/credentials; no absolute paths; nothing referenced outside the plugin directory
- [ ] Dependencies declared with semver ranges; dependency components referenced by namespaced name
- [ ] Behavior evals run (old + new cases) — results below
- [ ] Permission changes (agent `tools:`, hooks, MCP servers) listed below
- [ ] `version` bumped in `plugin.json` if shipped behavior changed — see `docs/RELEASES.md`
- [ ] Plugin `CHANGELOG.md` and root `CHANGELOG.md` updated
- [ ] `CODEOWNERS` updated (if this adds a new plugin author)

## Eval results

## Permission changes

None.
