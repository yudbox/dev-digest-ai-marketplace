#!/usr/bin/env node
// Bumps a plugin's (or the marketplace's own) version, moves the
// CHANGELOG's [Unreleased] section into a dated version heading, and
// prints the git tag command to run next. Never commits, tags, or pushes
// on its own — see docs/RELEASES.md.
//
// Usage:
//   node scripts/release.mjs --plugin <name> --bump patch|minor|major
//   node scripts/release.mjs --plugin <name> --version 1.2.0
//   node scripts/release.mjs --marketplace --bump minor

import path from "node:path";
import {
  assertCleanWorkingTree,
  bumpSemver,
  parseSemver,
  pluginChangelogPath,
  pluginManifestPath,
  readJson,
  releaseChangelog,
  writeJson,
} from "./lib/release-utils.mjs";

const ROOT = process.cwd();

function parseArgs(argv) {
  const args = { bump: null, version: null, plugin: null, marketplace: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--plugin") args.plugin = argv[++i];
    else if (a === "--marketplace") args.marketplace = true;
    else if (a === "--bump") args.bump = argv[++i];
    else if (a === "--version") args.version = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.plugin && !args.marketplace) {
    throw new Error("Specify either --plugin <name> or --marketplace");
  }
  if (args.plugin && args.marketplace) {
    throw new Error("Specify only one of --plugin <name> or --marketplace");
  }
  if (!args.bump && !args.version) {
    throw new Error("Specify either --bump patch|minor|major or --version x.y.z");
  }
  if (args.bump && args.version) {
    throw new Error("Specify only one of --bump or --version");
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  assertCleanWorkingTree(ROOT);

  const manifestPath = args.marketplace
    ? path.join(ROOT, ".claude-plugin/marketplace.json")
    : pluginManifestPath(ROOT, args.plugin);

  const manifest = readJson(manifestPath);
  const currentVersion = manifest.version;
  if (!currentVersion) {
    throw new Error(
      `${manifestPath} has no "version" field to bump. Set an initial version first (see docs/RELEASES.md).`
    );
  }

  const newVersion = args.version ?? bumpSemver(currentVersion, args.bump);
  parseSemver(newVersion); // validate shape

  manifest.version = newVersion;
  writeJson(manifestPath, manifest);
  console.log(`✔ ${manifestPath}: ${currentVersion} -> ${newVersion}`);

  // A plugin release only cuts that plugin's own CHANGELOG. The root
  // CHANGELOG belongs to the marketplace: its [Unreleased] section collects
  // entries from every plugin and is cut only by a --marketplace release,
  // so one plugin's version number never swallows other plugins' entries.
  const changelog = args.plugin ? pluginChangelogPath(ROOT, args.plugin) : path.join(ROOT, "CHANGELOG.md");
  if (releaseChangelog(changelog, newVersion)) {
    console.log(`✔ Moved [Unreleased] -> [${newVersion}] in ${changelog}`);
  } else {
    console.log(`⚠ No [Unreleased] content in ${changelog} — add release notes before committing`);
  }

  // Claude Code resolves plugin dependencies from tags named
  // {plugin-name}--v{version} (double dash) — any other shape is invisible
  // to the resolver and surfaces as `no-matching-tag`.
  const tagName = args.plugin ? `${args.plugin}--v${newVersion}` : `v${newVersion}`;
  console.log("\nNext steps:");
  console.log(`  git add -A`);
  console.log(`  git commit -m "release: ${args.plugin ?? "marketplace"} ${newVersion}"`);
  if (args.plugin) {
    console.log(`  # after the release commit is merged to main and CI is green:`);
    console.log(`  cd plugins/${args.plugin} && claude plugin tag --dry-run && claude plugin tag --push`);
    console.log(`  # (equivalent manual form: git tag -a ${tagName} -m "${tagName}" && git push origin ${tagName})`);
  } else {
    console.log(`  git tag -a ${tagName} -m "${tagName}"`);
    console.log(`  git push && git push origin ${tagName}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`✘ ${err.message}`);
  process.exit(1);
}
