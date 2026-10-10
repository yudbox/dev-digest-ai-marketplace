# Plugins

One folder per plugin, each registered in `../.claude-plugin/marketplace.json`:

| Folder | Plugin |
|---|---|
| `engineering-paved-path/` | shared engineering skills |
| `research-tools/` | read-only researcher agent |
| `architecture-review/` | read-only architecture reviewer (→ engineering-paved-path) |
| `sdd-engineering/` | Spec-Driven Development workflow (→ all three) |

To add one, start from `../templates/example-plugin/` and follow the
step-by-step workflow in `../CONTRIBUTING.md`. Full reference on plugin
structure and manifest fields: `../docs/PLUGIN-GUIDELINES.md`.
