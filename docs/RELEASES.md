# Releases & Versioning

## SemVer bump table

Each plugin is versioned independently in its own `plugin.json`:

| Bump | Example | When |
|---|---|---|
| **patch** | `1.0.0` → `1.0.1` | bugfix, no behavior change |
| **minor** | `1.0.0` → `1.1.0` | new feature, backward-compatible |
| **major** | `1.0.0` → `2.0.0` | breaking change |

## The version-bump gotcha

Claude Code resolves a plugin's installed version in this order: the
plugin's own `plugin.json` `version` wins first, then the marketplace
entry's `version`, then (for git-based sources) the commit SHA, then
`unknown`.

**If you set an explicit `version` in `plugin.json`, you must bump it on
every release.** Pushing new commits without bumping the version string
means existing users' Claude Code installs will see the same version and
will not pick up the update. If `version` is omitted entirely, every new
commit counts as a new version automatically — convenient for an
actively-developed internal plugin, but risky if you want stable, pinned
releases. Never set `version` in both `plugin.json` and the marketplace
entry — `plugin.json` silently wins at install time if they diverge (see
"Monorepo caveat" below for this repo's rule).

> SemVer communicates the *nature* of a change, not the exact bytes that
> shipped. Two different commits can both legitimately be tagged `1.2.0`.
> If you need to reference or reproduce an exact release, use the commit
> **SHA**, not just the version number.

### Monorepo caveat: local `source` paths and the SHA fallback

This marketplace uses local relative-path sources
(`"source": "./plugins/<name>"`), not a separate repo per plugin. Without a
`version`, Claude Code falls back to "the commit SHA of the installed
directory" — a moving target in a shared monorepo, and an implicit one:
users see an opaque SHA instead of a SemVer number, and nothing ties an
"update" to an intentional release.
**Always set an explicit `version` in every plugin's `plugin.json`** — and
only there (see the next paragraph) — so an update reaches users exactly
when the plugin owner bumps it.

**`version` lives in `plugin.json` only.** Do not also set `version` on
the plugin's entry in `marketplace.json`: when both are set, `plugin.json`
wins without a warning at install time (only `claude plugin validate`
reports the mismatch). `scripts/validate-marketplace.mjs` fails the build
if an entry declares `version`.

## Release process (per plugin)

1. Make the change to the plugin's components.
2. Add the change under `[Unreleased]` in the plugin's own `CHANGELOG.md`,
   and a one-line entry under `[Unreleased]` in the root marketplace
   `CHANGELOG.md`.
3. Bump `version` in the plugin's `plugin.json` per the table above
   (`node scripts/release.mjs --plugin <name> --bump <level>` bumps it and
   moves the plugin CHANGELOG's `[Unreleased]` into the new version
   heading; the root CHANGELOG is cut only by a `--marketplace` release).
4. Run the plugin's behavior evals (`plugins/<name>/evals/`) — old cases
   **and** any new ones — before publishing. A prompt has no stable
   semantics the way a function signature does: one changed sentence can
   change activation rate or output, so *every* bump, patch included,
   goes through evals. This repo's CI validates structure only (see
   `docs/SECURITY.md`); behavior evals are the plugin owner's gate.
5. Merge the release commit to `main` and wait for CI to go green.
6. Tag that exact merged commit (see "Tag convention" below) and record
   the commit SHA in the plugin's `CHANGELOG.md` entry, so the release is
   reproducible independent of the version string.

### Tag convention — `{plugin-name}--v{version}`

Claude Code resolves version-constrained `dependencies` against git tags
in this repo named **`{plugin-name}--v{version}`** — note the **double
dash**:

```
engineering-paved-path--v1.0.0
research-tools--v1.0.0
architecture-review--v1.0.0
sdd-engineering--v1.0.0
```

Any other shape (`sdd-engineering-v1.0.0`, `v1.0.0`) is invisible to the
resolver and shows up as `no-matching-tag` in `claude plugin list --json`
and `/doctor`.

Create tags with the built-in command from inside the plugin directory —
it validates that `plugin.json` and the marketplace entry agree, then
creates the correctly-named tag:

```
cd plugins/<name>
claude plugin tag --dry-run   # shows what would be tagged
claude plugin tag --push      # creates {name}--v{version} and pushes it
```

Tags are **immutable**: never move or re-create a published tag. A fix is
always a new version with a new tag.

### Dependency order

If a plugin declares `dependencies` on another plugin, release the
dependency first, then the consumer plugin. Our plugins use relative-path
sources, so when no `{name}--v{version}` tag satisfies the consumer's
range (`^1.0.0`), Claude Code does **not** fail the install — it installs
the marketplace's current copy of the dependency and checks the range
when the plugin loads. If that copy is outside the range, the consumer
stays disabled and `claude plugin list` shows
`Requires "<dep>@dev-digest-ai-marketplace" ^1.0.0, installed <x.y.z>`.
For this marketplace:

```
1. engineering-paved-path   (no deps)
2. research-tools           (no deps)
3. architecture-review      (→ engineering-paved-path)
4. sdd-engineering          (→ all three above)
```

If several installed plugins depend on the same plugin, the resolver
intersects their semver ranges and picks the highest version satisfying
all of them; an empty intersection (`range-conflict`) disables the
dependent plugin. Claude Code keeps no npm-style lockfile — for an audit
trail keep the output of `claude plugin list --json`, the declared
ranges, the release tags and their SHAs.

## Catalog vs. installed plugin — two different updates

These are separate operations and easy to conflate:

- `/plugin marketplace update [name]` — refreshes the **catalog** (the list
  of available plugins and their advertised versions) from this repo.
- `/plugin update <plugin>@dev-digest-ai-marketplace` — updates a user's
  already-**installed** plugin to the version the catalog currently
  advertises.

Editing `.claude-plugin/marketplace.json` is only required when **adding or
removing** a plugin from the catalog. Bumping an existing plugin's own
`version` in its `plugin.json` does not require touching
`marketplace.json` at all.

## Release channels: `latest` and `stable`

Claude Code has **no `plugin rollback` command**. Rollback is a procedure
built on two channels pointing at different refs of this same repo:

| Channel | Points at | Who uses it |
|---|---|---|
| `latest` | `main` (default when added as `yudbox/dev-digest-ai-marketplace`) | authors, beta users |
| `stable` | the git tag / 40-char SHA of the **last-known-good** release, e.g. `sdd-engineering--v1.0.0` | everyone else; the rollback target |

The last-known-good release for each plugin is recorded at the top of
that plugin's `CHANGELOG.md` together with its SHA. It moves forward only
after a new release has passed clean-install, upgrade and activation
checks (below).

### Three checks before a release counts as good

1. **Clean install** — empty environment: no personal dotfiles, no user
   skills, no old plugin cache, no production credentials.
2. **Upgrade** — install the *previous* release through the marketplace,
   then update to the new one. Not a fresh checkout of the author's tree.
3. **Activation** — run a behavior eval in a **new or reloaded session**.
   The version number in `claude plugin list` alone proves nothing: hooks,
   MCP servers and the cache path can stay bound to the old version until
   `/reload-plugins` or a new session.

## Rollback

### Rolling a user/project back (the procedure)

1. Remove or disable the `latest` channel in the affected project.
2. Add the marketplace pinned to the last-known-good ref (the `stable`
   channel) — git URL with `#<tag-or-sha>`:
   ```
   claude plugin marketplace remove dev-digest-ai-marketplace
   claude plugin marketplace add "https://github.com/yudbox/dev-digest-ai-marketplace.git#sdd-engineering--v1.0.0" --scope project
   claude plugin install sdd-engineering@dev-digest-ai-marketplace --scope project
   ```
3. `/reload-plugins` (or start a new session).
4. `claude plugin list --json` — confirm the expected version.
5. Run the plugin's smoke eval (see its `README.md` → Verification).
6. Return to `latest` only after the broken release is fixed by a **new**
   version, and you have checked that the user's plugin data
   (`${CLAUDE_PLUGIN_DATA}`) survives the switch.

> The exact command sequence above is rehearsed in the lab (step 11) and
> must be re-verified against the current CLI before relying on it in an
> incident.

If the broken release ran a hook, a daemon, or touched an external
system, restoring files is **not** a complete rollback — see
`docs/SECURITY.md` → "After an unsafe release".

### Pinning sources (background)

For a **remote**-sourced plugin entry (`github`, `url`, `git-subdir`), the
`source` object can pin to a specific `ref` (branch/tag) or `sha`:

```json
{ "name": "my-plugin", "source": { "source": "github", "repo": "owner/repo", "sha": "<previous commit sha>" } }
```

To roll back, point `source` at the previous tag/SHA. Tags are expected to
be immutable once published, but a `sha` is the only fully deterministic
reference — prefer `sha` over `ref` when you need a rollback to reproduce
exactly, since (unlike a SHA) nothing technically prevents a tag from being
recreated elsewhere.

**This marketplace's plugins don't use that mechanism** — they're
registered with a local relative-path `source` (`./plugins/<name>`), which
has no `ref`/`sha` field to pin at all; the plugin's content simply *is*
whatever's on disk at the marketplace repo's current commit — which is
why the `stable` channel above pins the **whole marketplace** to a ref.

To *fix forward* for everyone on `latest` (rather than pinning one
project), use `scripts/rollback.mjs` (see below): it restores that
plugin's folder from an older git ref and publishes it as a new,
forward-moving release (never a silent downgrade: users only receive an
update when the computed version changes — see "The version-bump gotcha"
above).

If you ever need true independent per-plugin SHA-pinning despite the
monorepo layout, you can re-register that one plugin's entry as a
`git-subdir` source pointing back at this same repo's URL with an explicit
`path` and `sha` — this is a valid escape hatch, just not the default here.

### `scripts/release.mjs` and `scripts/rollback.mjs`

Two small, dependency-free Node helpers operationalize the process above,
so the version-bump gotcha and the CHANGELOG-update step aren't left to
manual memory:

- **`node scripts/release.mjs --plugin <name> --bump patch|minor|major`**
  (or `--marketplace` instead of `--plugin`, and/or `--version x.y.z`
  instead of `--bump`) — bumps the target `version` field, moves the
  `[Unreleased]` section of the target's own CHANGELOG (the plugin's for
  `--plugin`, the root one for `--marketplace`) into a new dated version
  heading, and prints the `claude plugin tag` command (tag
  `{name}--v{version}`) to run after merge. Refuses to
  run on a dirty working tree, so a release always corresponds to a clean,
  reviewable commit.
- **`node scripts/rollback.mjs --plugin <name> --to <git-ref-or-sha> [--version x.y.z]`**
  — restores `plugins/<name>/` exactly as it was at the given historical
  ref (files added later are removed too), bumps its
  `version` forward (to keep users actually receiving the revert as an
  update, per the version-bump gotcha), and reminds you to add a
  `CHANGELOG.md` entry explaining the revert before committing.

Both scripts only stage local changes — they never commit, tag, or push on
their own; that's a deliberate final human step.

## Removing a plugin from the catalog

Claude Code has **no deprecation state** for a marketplace entry — a note
in `description` is just text and changes nothing for installed users.
Silently deleting the entry is also wrong: existing installs then report
`Plugin "<name>" not found in marketplace`.

To pull a plugin:

1. Remove its entry from `plugins` in `.claude-plugin/marketplace.json`.
2. Record the removal in the top-level `renames` map: `"<name>": null`.
   Users who still have it enabled get `Removed from the
   "dev-digest-ai-marketplace" marketplace` and the key is dropped from
   their settings.
3. Optionally set `"forceRemoveDeletedPlugins": true` at the top level —
   then Claude Code also **uninstalls** removed plugins from users'
   machines at the next session start (plugins installed only by managed
   settings stay). Without it, the removed plugin's copy stays installed.

Announce the removal in the root `CHANGELOG.md` first, so users have a
migration window before step 1 lands.

## Name stability / renaming

- A plugin's `name` never changes after publishing — users have it
  installed under that exact slug. Renaming it carelessly breaks existing
  installs with `plugin-not-found`.
- To change what's shown in the UI without breaking installs, change
  `displayName`, not `name`.
- To actually rename or remove a plugin, use the marketplace's top-level
  `renames` map so existing users are migrated automatically:

  ```json
  "renames": { "old-name": "new-name" }
  ```

  Requires Claude Code ≥2.1.193.
