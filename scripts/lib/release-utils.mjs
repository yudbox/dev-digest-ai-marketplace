// Shared helpers for scripts/release.mjs and scripts/rollback.mjs.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseSemver(v) {
  const m = SEMVER_RE.exec(v);
  if (!m) throw new Error(`"${v}" is not a valid MAJOR.MINOR.PATCH semver string`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

export function bumpSemver(current, bump) {
  const { major, minor, patch } = parseSemver(current);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown bump type "${bump}" (expected patch|minor|major)`);
}

export function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

export function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}

export function assertCleanWorkingTree(root) {
  const out = execSync("git status --porcelain", { cwd: root, encoding: "utf8" });
  if (out.trim().length > 0) {
    throw new Error(
      "Working tree is not clean. Commit or stash your changes before running this script:\n" + out
    );
  }
}

export function resolveGitRef(root, ref) {
  try {
    return execSync(`git rev-parse --verify ${JSON.stringify(ref)}`, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    throw new Error(`git ref "${ref}" does not resolve to a commit in this repository`);
  }
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

// Moves the content of "## [Unreleased]" into a new "## [version] - date"
// section, leaving a fresh empty Unreleased section at the top. Returns
// false (no-op) if the file doesn't exist or has no Unreleased content.
export function releaseChangelog(changelogPath, version) {
  if (!fs.existsSync(changelogPath)) return false;

  const text = fs.readFileSync(changelogPath, "utf8");
  const lines = text.split("\n");

  const unreleasedIdx = lines.findIndex((l) => /^##\s*\[Unreleased\]/i.test(l));
  if (unreleasedIdx === -1) return false;

  let nextHeadingIdx = lines.findIndex((l, i) => i > unreleasedIdx && /^##\s*\[/.test(l));
  if (nextHeadingIdx === -1) nextHeadingIdx = lines.length;

  const body = lines.slice(unreleasedIdx + 1, nextHeadingIdx);
  const hasContent = body.some((l) => l.trim().length > 0);
  if (!hasContent) return false;

  const newLines = [
    ...lines.slice(0, unreleasedIdx),
    "## [Unreleased]",
    "",
    `## [${version}] - ${todayISODate()}`,
    ...body,
    ...lines.slice(nextHeadingIdx),
  ];

  fs.writeFileSync(changelogPath, newLines.join("\n"));
  return true;
}

// Inserts a bullet line right after "## [Unreleased]" (creating that
// heading at the top of the file if it doesn't exist yet). Used by
// scripts/rollback.mjs to leave a ready-to-edit changelog placeholder.
export function addUnreleasedEntry(changelogPath, line) {
  if (!fs.existsSync(changelogPath)) return false;

  const text = fs.readFileSync(changelogPath, "utf8");
  const lines = text.split("\n");
  const unreleasedIdx = lines.findIndex((l) => /^##\s*\[Unreleased\]/i.test(l));

  if (unreleasedIdx === -1) {
    fs.writeFileSync(changelogPath, `## [Unreleased]\n\n${line}\n\n` + text);
    return true;
  }

  const newLines = [...lines.slice(0, unreleasedIdx + 1), "", line, ...lines.slice(unreleasedIdx + 1)];
  fs.writeFileSync(changelogPath, newLines.join("\n"));
  return true;
}

export function pluginManifestPath(root, pluginName) {
  return path.join(root, "plugins", pluginName, ".claude-plugin", "plugin.json");
}

export function pluginChangelogPath(root, pluginName) {
  return path.join(root, "plugins", pluginName, "CHANGELOG.md");
}
