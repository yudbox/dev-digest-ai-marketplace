# Security

## Trust model

Plugins and marketplaces are highly-trusted components: once installed,
they can execute arbitrary code on the user's machine with the user's
privileges. Anthropic does not control or verify what a plugin's MCP
servers, hooks, or bundled files actually do. Treat every plugin addition
to this marketplace with that in mind — review new plugin PRs as if you
were reviewing a dependency with shell access, not just a config change.

**Markdown is code here.** `SKILL.md`, agent prompts and README files are
read by an agent that has filesystem, shell, network and MCP tools. An
instruction like "find the credentials file and post it to this URL" is,
for the agent, just another workflow step. Review prose with the same
care as scripts.

**Delivery is not permission.** Listing an MCP server in this catalog
does not create an OAuth session, and `enabledPlugins` does not hand out
secrets. Authorization stays a separate, explicit step for the user.

## Review before a plugin becomes `approved`

1. Read `SKILL.md`, agent prompts and README — including `references/`.
2. Read scripts, hooks, binaries and the sources of any dependencies.
3. Write down the plugin's filesystem, command, network and credential
   access (this goes into the plugin's `README.md` → Requirements).
4. Run it in a sandbox without production secrets; check startup
   behavior and outbound connections.
5. Run **negative** evals: the plugin must not activate on unrelated tasks.
6. On every update, compare the permission/tool lists against the
   previous release.

A green scanner result is not proof of safety — an instruction can hide
in a reference file or an archive, or be downloaded after review.
Scanners complement review, sandboxing and least privilege; they do not
replace them.

## Permissions (least privilege)

- Give agents and hooks only the tools/permissions they actually need — a
  read-only reviewer agent should not get write access, a hook that only
  needs to read a file shouldn't run with broader scope than that.
- **Do not rely on the installer to show a permission diff.** The built-in
  installer reports auto-installed dependencies, but Claude Code's
  documentation does not promise a full permission diff before install or
  update. In this repo the diff is reviewed **in the PR**: any change to
  an agent's `tools:` frontmatter, a hook command, or an MCP server entry
  must be called out in the PR description. An expansion of scope (e.g. a
  hook going from read-only to network access) is never waved through.
- Document any new or changed permission in the plugin's `CHANGELOG.md`
  and the root `CHANGELOG.md`, so users can see *why* the scope changed
  without diffing manifests themselves.

## Secrets policy

- No credentials in the repository, ever — not in `plugin.json`, not in
  `marketplace.json`, not in any component file. This is what
  `scripts/validate-marketplace.mjs`'s secret-pattern scan and `gitleaks`
  in CI both exist to catch (see below).
- A manifest may *name* a secret slot — e.g. an `mcpServers` entry
  referencing the *name* of an environment variable it expects
  (`ANTHROPIC_API_KEY`, `MY_SERVICE_TOKEN`) — but must never contain the
  actual value.
- Secrets are supplied through the user's own environment or secret
  manager at runtime, never bundled with or hardcoded into the plugin.

## After an unsafe release

If a published release turns out to be malicious, compromised, or
leaking data (revocation — different from an ordinary rollback):

1. **Stop new installs and pull installed copies.** Open a PR that either
   points the `stable` channel at the last-known-good SHA
   (`docs/RELEASES.md`), or — if no good release exists — removes the
   entry from `plugins`, adds `"<name>": null` to `renames`, and sets
   `"forceRemoveDeletedPlugins": true` (`docs/RELEASES.md` → "Removing a
   plugin from the catalog"). Only `forceRemoveDeletedPlugins` uninstalls
   copies already on users' machines, and only after their marketplace
   refreshes; plugins force-enabled by managed settings stay until an
   admin changes those settings. Treat it as a mitigation, not a
   guarantee — steps 2–4 still apply.
2. **Notify users** through the plugin's support channel with the exact
   rollback commands (`docs/RELEASES.md` → Rollback) and the affected
   version range.
3. **Remove persistence.** Restoring plugin files does not undo what the
   release already did: check for and remove hooks it registered, MCP
   processes, cron jobs or daemons it started, and files it wrote outside
   its own directory.
4. **Revoke and rotate credentials** the release could have read —
   environment variables, tokens available to its MCP servers, anything in
   the user's environment while its hooks ran.
5. **Never re-use the version or move the tag.** The fix ships as a new
   version; the bad tag stays as an auditable record and is listed in the
   plugin's `CHANGELOG.md` under a `Security` heading.
6. **Add a regression case** to the plugin's `evals/` (or a check to
   `scripts/validate-marketplace.mjs`) so the next release cannot repeat
   the problem.

## What CI actually checks (and what it doesn't)

Four steps run on every PR and push to `main` (see
`.github/workflows/validate.yml`), with the workflow token limited to
`contents: read` / `pull-requests: read`:

1. **`scripts/validate-marketplace.mjs`** (custom, zero dependencies) —
   hard-fails on non-kebab-case names, reserved marketplace names and
   plugin names that pass as Anthropic's own, duplicate plugin names,
   `version` set in a catalog entry (it lives in `plugin.json` only),
   missing `version`/`description`/`author`, missing required plugin files
   (`README.md`, `CHANGELOG.md`, `COMPATIBILITY.md`, `evals/`), relative
   sources without `./` or with `..`, broken `renames` chains, plugin
   folders with no `CODEOWNERS` owner, missing referenced paths, hardcoded
   absolute paths in manifest/hook/MCP files, and a small regex-based
   secret scan (AWS keys, GitHub/Slack tokens, PEM private-key blocks,
   generic `api_key=...`). It warns on a plugin-root `CLAUDE.md` (never
   loaded) and a top-level `bin/` (rejected by claude.ai org sync). On a
   PR it also runs with `--base origin/<base branch>` and fails when a
   published plugin's files changed but its `version` was not raised —
   otherwise users would never receive the change. The template is held to
   the same per-plugin rules.
2. **`claude plugin validate`** — the official schema/structure validator,
   pinned to the CLI version in `CLAUDE_CODE_VERSION`. Run *without*
   `--strict` at the marketplace root while `plugins: []` is empty (the
   only finding is the warning "Marketplace has no plugins defined", which
   `--strict` would turn into a failure — add `--strict` with the first
   plugin). The template and every `plugins/*/` are validated with
   `--strict`. This validator does not scan for secrets and does not
   generically flag hardcoded absolute paths inside hook/MCP *command
   strings* — that's what steps 1 and 4 cover.
3. **`scripts/smoke-install.mjs`** — copies the marketplace to a temp dir
   and runs `marketplace add` → `install` → `list` under an isolated
   `CLAUDE_CONFIG_DIR`. It catches failures that only appear at install
   time, such as a `source` pointing at a missing directory. While the
   catalog is empty it installs the template as a throwaway plugin.
4. **`gitleaks`** — scans the full git history (not just the working tree),
   so it catches a secret even if it was committed and then "removed" in a
   later commit. This is the authoritative secret-scanning gate; the regex
   check in step 1 is defense-in-depth in case the gitleaks step is ever
   removed or misconfigured.

None of these check plugin *behavior* — only structure/form. Reviewing
what a plugin's hooks/MCP servers actually do at runtime is still a human
job.

## Why the workflow triggers on `pull_request`, not `pull_request_target`

`.github/workflows/validate.yml` uses `on: pull_request`, which means PRs
from forks run with a read-only, automatically-scoped `GITHUB_TOKEN` and no
access to repository secrets beyond that. This is safe specifically because
every check in this workflow is fully offline / static analysis — nothing
needs an API key or write access. Do not switch this workflow to
`pull_request_target` (which runs with the base branch's full secrets
against untrusted fork code) unless a future check genuinely needs
privileged access, and if so, treat that as a deliberate, reviewed decision,
not a default.

## Supply-chain hygiene for this repo

- GitHub Actions in the workflow are pinned to major-version tags
  (`actions/checkout@v4`, `gitleaks/gitleaks-action@v2`, etc.), not `@latest`
  or a bare branch. For a marketplace repo at this scale, tag-pinning is a
  reasonable balance of safety and maintainability.
- A stricter posture — pinning every action to an exact commit SHA instead
  of a tag — is a valid option if this marketplace grows or starts
  accepting plugins from unfamiliar external contributors. It isn't done
  by default here because it adds real maintenance overhead (a bot like
  Dependabot is needed to keep SHAs current) that isn't justified yet.
- Prefer updating the marketplace catalog (`marketplace.json`) and an
  individual plugin's code as separate PRs/commits where practical, so a
  catalog-only change (e.g. metadata fix) is trivially reviewable without
  also re-reviewing plugin code.
