#!/usr/bin/env node
// Rolls a local (monorepo-style) plugin back to a previously-known-good
// state. This marketplace's plugins use a local relative-path `source`
// (./plugins/<name>), which has no ref/sha field to pin — so "rollback"
// here means restoring that plugin's folder from an older git ref and
// publishing it as a new, forward-moving release (never a silent
// downgrade). See docs/RELEASES.md.
//
// Usage:
//   node scripts/rollback.mjs --plugin <name> --to <git-ref-or-sha> [--version x.y.z]

import path from "node:path";
import { execSync } from "node:child_process";
import {
  addUnreleasedEntry,
  assertCleanWorkingTree,
  bumpSemver,
  parseSemver,
  pluginChangelogPath,
  pluginManifestPath,
  readJson,
  resolveGitRef,
  writeJson,
} from "./lib/release-utils.mjs";

const ROOT = process.cwd();

function parseArgs(argv) {
  const args = { plugin: null, to: null, version: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--plugin") args.plugin = argv[++i];
    else if (a === "--to") args.to = argv[++i];
    else if (a === "--version") args.version = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.plugin) throw new Error("Specify --plugin <name>");
  if (!args.to) throw new Error("Specify --to <git-ref-or-sha>");
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  assertCleanWorkingTree(ROOT);
  const resolvedSha = resolveGitRef(ROOT, args.to);

  const manifestPath = pluginManifestPath(ROOT, args.plugin);
  const pluginDirRel = path.join("plugins", args.plugin);

  const preRollback = readJson(manifestPath);
  const preRollbackVersion = preRollback.version ?? "unknown";

  // `git restore` (no-overlay) also deletes files that were added after
  // <ref>; `git checkout <ref> -- <dir>` would leave them behind and ship a
  // mix of old and new files as the "rolled back" plugin.
  try {
    execSync(
      `git restore --source=${JSON.stringify(args.to)} --staged --worktree -- ${JSON.stringify(pluginDirRel)}`,
      { cwd: ROOT, stdio: "pipe" }
    );
  } catch (err) {
    throw new Error(
      `Could not restore ${pluginDirRel} from "${args.to}" (${resolvedSha.slice(0, 12)}). ` +
        `Does that path exist at that ref?\n${err.stderr ?? err.message}`
    );
  }

  const restored = readJson(manifestPath);
  const newVersion = args.version ?? bumpSemver(preRollbackVersion, "patch");
  parseSemver(newVersion); // validate shape
  restored.version = newVersion;
  writeJson(manifestPath, restored);

  const entry =
    `- Rolled back **${args.plugin}** to \`${args.to}\` (${resolvedSha.slice(0, 12)}), ` +
    `was ${preRollbackVersion}, now ${newVersion} — <explain why here before committing>.`;
  addUnreleasedEntry(path.join(ROOT, "CHANGELOG.md"), entry);
  addUnreleasedEntry(pluginChangelogPath(ROOT, args.plugin), entry);

  console.log(`✔ Restored ${pluginDirRel} from ${args.to} (${resolvedSha.slice(0, 12)})`);
  console.log(`✔ ${manifestPath}: ${preRollbackVersion} -> ${newVersion} (forward-moving revert)`);
  console.log(`✔ Added an [Unreleased] placeholder entry to CHANGELOG.md(s) — edit the "<explain why>" part`);
  console.log("\nBefore committing:");
  console.log(`  1. Edit the CHANGELOG entry above to explain the revert.`);
  console.log(`  2. node scripts/validate-marketplace.mjs && claude plugin validate ${pluginDirRel} --strict`);
  console.log(`  3. git add -A && git commit -m "revert: ${args.plugin} to ${args.to}"`);
  console.log(`  4. git tag -a ${args.plugin}--v${newVersion} -m "${args.plugin}--v${newVersion}" && git push --follow-tags`);
}

try {
  main();
} catch (err) {
  console.error(`✘ ${err.message}`);
  process.exit(1);
}
