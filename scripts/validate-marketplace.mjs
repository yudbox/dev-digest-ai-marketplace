#!/usr/bin/env node
// Layer-2 structural validator for this marketplace repo.
// Covers what `claude plugin validate` does not: hard kebab-case enforcement,
// this repo's own rules (version only in plugin.json, required files,
// CODEOWNERS coverage, version bump per PR), path existence, hardcoded
// absolute paths, and a secret-scanning fallback.
// Zero npm dependencies on purpose — this repo already needs Node in CI to
// run the Claude Code CLI, so no extra install step or supply-chain surface.
//
// Usage:
//   node scripts/validate-marketplace.mjs                 # working-tree checks
//   node scripts/validate-marketplace.mjs --base <ref>    # + version-bump check against <ref>

import fs from "node:fs";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";
import { parseSemver } from "./lib/release-utils.mjs";

const ROOT = process.cwd();
const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TEMPLATE_DIR = "templates/example-plugin";

// Marketplace names Claude Code refuses
// (code.claude.com/docs/en/plugins/marketplace-reference#reserved-names).
const RESERVED_MARKETPLACE_NAMES = new Set([
  // official marketplaces
  "claude-code-marketplace",
  "claude-code-plugins",
  "claude-plugins-official",
  "anthropic-marketplace",
  "anthropic-plugins",
  "agent-skills",
  "anthropic-agent-skills",
  "life-sciences",
  "knowledge-work-plugins",
  "claude-for-legal",
  "claude-for-financial-services",
  "financial-services-plugins",
  "first-party-plugins",
  "claude-tag-plugins",
  // community marketplaces
  "claude-community",
  "claude-plugins-community",
  "healthcare",
  // plugin directory
  "anthropic-plugin-directory",
  "claude-plugin-directory",
  // origins Claude Code uses for non-marketplace plugins
  "inline",
  "builtin",
  "skills-dir",
  "synced",
  "claude-plugin-test",
  // package-manager / host names
  "npm",
  "pip",
  "uv",
  "cargo",
  "github",
  "gh",
]);

// Plugin names that "pass as one of Anthropic's own"
// (code.claude.com/docs/en/plugins/manifest-reference#name).
const RESERVED_PLUGIN_PREFIXES = ["claude-", "anthropic-", "anthropics-", "cc-plugin-"];
const RESERVED_PLUGIN_NAMES = new Set(["claude", "anthropic", "anthropics", "claude-code", "claude-mods"]);

// "official" next to "claude"/"anthropic" anywhere in the name, e.g.
// official-claude-plugins — rejected for both marketplaces and plugins.
function impersonatesOfficial(name) {
  const parts = name.split("-");
  return parts.includes("official") && (parts.includes("claude") || parts.includes("anthropic"));
}

function marketplaceNameProblem(name) {
  if (RESERVED_MARKETPLACE_NAMES.has(name)) return "is a reserved marketplace name";
  if (name.startsWith("claudeai-")) return 'uses the "claudeai-" prefix reserved for claude.ai marketplaces';
  if (impersonatesOfficial(name)) return "impersonates an official Anthropic/Claude marketplace";
  return null;
}

function pluginNameProblem(name) {
  if (RESERVED_PLUGIN_NAMES.has(name)) return "is reserved for Anthropic";
  const prefix = RESERVED_PLUGIN_PREFIXES.find((p) => name.startsWith(p));
  if (prefix) return `starts with the reserved prefix "${prefix}"`;
  if (impersonatesOfficial(name)) return "passes as an official Anthropic plugin";
  return null;
}

// Files every plugin in this marketplace must ship (docs/PLUGIN-GUIDELINES.md).
const REQUIRED_PLUGIN_FILES = ["README.md", "CHANGELOG.md", "COMPATIBILITY.md", "evals"];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function parseArgs(argv) {
  const args = { base: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base") args.base = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

// Every file git knows about (tracked + untracked-but-not-ignored), so this
// works even before the first commit and never touches .gitignore'd files.
function gitListFiles() {
  const out = execSync("git ls-files --cached --others --exclude-standard", {
    cwd: ROOT,
    encoding: "utf8",
  });
  return out.split("\n").filter(Boolean);
}

// Recursively collect every "./"-prefixed string value in a parsed JSON
// object/array — a generic, schema-agnostic way to find component paths
// without hardcoding every field name plugin.json might use.
function collectRelativePaths(node, acc = []) {
  if (typeof node === "string") {
    if (node.startsWith("./")) acc.push(node);
  } else if (Array.isArray(node)) {
    for (const v of node) collectRelativePaths(v, acc);
  } else if (node && typeof node === "object") {
    for (const v of Object.values(node)) collectRelativePaths(v, acc);
  }
  return acc;
}

function validateLocalPlugin(pluginDir, manifestPath, entryName) {
  const manifest = readJson(manifestPath);
  const where = path.relative(ROOT, manifestPath);

  if (!KEBAB.test(manifest.name)) {
    fail(`plugin.json name "${manifest.name}" in ${where} is not kebab-case`);
  }
  if (manifest.name !== entryName) {
    fail(`plugin.json name "${manifest.name}" does not match marketplace entry name "${entryName}" (${where})`);
  }
  const nameProblem = pluginNameProblem(manifest.name ?? "");
  if (nameProblem) fail(`plugin name "${manifest.name}" ${nameProblem} (${where})`);

  // This marketplace requires version, description and author on top of
  // the official schema's single required `name`.
  if (!manifest.version) {
    fail(`${where}: missing "version" — this marketplace pins every plugin to an explicit version`);
  } else {
    try {
      parseSemver(manifest.version);
    } catch (err) {
      fail(`${where}: ${err.message}`);
    }
  }
  if (!manifest.description) fail(`${where}: missing "description"`);
  if (!manifest.author?.name) fail(`${where}: missing "author.name"`);
  if (manifest.repository !== undefined && typeof manifest.repository !== "string") {
    fail(`${where}: "repository" must be a URL string`);
  }

  for (const rel of collectRelativePaths(manifest)) {
    const resolved = path.resolve(pluginDir, rel);
    if (!fs.existsSync(resolved)) {
      fail(`plugin "${entryName}": referenced path "${rel}" does not exist (resolved ${resolved})`);
    }
  }

  for (const required of REQUIRED_PLUGIN_FILES) {
    if (!fs.existsSync(path.join(pluginDir, required))) {
      fail(`plugin "${entryName}": missing required ${required} (docs/PLUGIN-GUIDELINES.md → Required files)`);
    }
  }

  if (fs.existsSync(path.join(pluginDir, "CLAUDE.md"))) {
    warn(`plugin "${entryName}": CLAUDE.md at the plugin root is not loaded by Claude Code — move it into a skill`);
  }
  if (fs.existsSync(path.join(pluginDir, "bin"))) {
    warn(
      `plugin "${entryName}": top-level bin/ makes claude.ai organization sync reject the plugin — use scripts/ instead`
    );
  }
}

// Each `renames` key must lead, possibly through a chain, to null or to a
// name that is still in `plugins` — the same rule `claude plugin validate`
// applies, repeated here so the error names the whole chain.
function validateRenames(renames, pluginNames) {
  if (renames === undefined) return;
  if (!renames || typeof renames !== "object" || Array.isArray(renames)) {
    fail(`marketplace.json "renames" must be an object`);
    return;
  }
  for (const start of Object.keys(renames)) {
    const chain = [start];
    let current = start;
    while (Object.hasOwn(renames, current)) {
      const target = renames[current];
      if (target === null) break;
      if (chain.includes(target)) {
        fail(`renames: chain ${[...chain, target].join(" → ")} cycles`);
        break;
      }
      chain.push(target);
      current = target;
    }
    const end = renames[current];
    if (end !== null && !Object.hasOwn(renames, current) && !pluginNames.has(current)) {
      fail(`renames: chain ${chain.join(" → ")} ends at "${current}", which is not in plugins[] or null`);
    }
  }
}

function validateMarketplace() {
  const mktPath = path.join(ROOT, ".claude-plugin/marketplace.json");
  if (!fs.existsSync(mktPath)) {
    fail(`Missing ${mktPath}`);
    return [];
  }
  const mkt = readJson(mktPath);

  if (!KEBAB.test(mkt.name ?? "")) {
    fail(`marketplace.json name "${mkt.name}" is not kebab-case`);
  }
  const mktNameProblem = marketplaceNameProblem(mkt.name ?? "");
  if (mktNameProblem) fail(`marketplace.json name "${mkt.name}" ${mktNameProblem}`);
  if (!mkt.owner?.name) fail(`marketplace.json: missing "owner.name"`);
  if (!Array.isArray(mkt.plugins)) {
    fail(`marketplace.json: "plugins" must be an array`);
    return [];
  }

  const localPlugins = [];
  const seenNames = new Set();
  for (const entry of mkt.plugins) {
    if (!entry.name) {
      fail(`plugin entry missing "name": ${JSON.stringify(entry)}`);
      continue;
    }
    if (!KEBAB.test(entry.name)) {
      fail(`plugin entry "${entry.name}" is not kebab-case`);
    }
    if (seenNames.has(entry.name)) {
      fail(`duplicate plugin name "${entry.name}" in marketplace.json`);
    }
    seenNames.add(entry.name);

    // docs/RELEASES.md: version lives in plugin.json only — when both are
    // set, plugin.json silently wins at install time.
    if (entry.version !== undefined) {
      fail(`plugin entry "${entry.name}": remove "version" from marketplace.json — set it in plugin.json only`);
    }

    if (typeof entry.source === "string") {
      if (!entry.source.startsWith("./")) {
        fail(`plugin "${entry.name}": relative source must start with "./" (got "${entry.source}")`);
        continue;
      }
      if (entry.source.split("/").includes("..")) {
        fail(`plugin "${entry.name}": source must not contain ".." (got "${entry.source}")`);
        continue;
      }
      const pluginDir = path.resolve(ROOT, entry.source);
      if (!fs.existsSync(pluginDir)) {
        fail(`plugin "${entry.name}": source path does not exist: ${entry.source}`);
        continue;
      }
      const manifestPath = path.join(pluginDir, ".claude-plugin/plugin.json");
      if (!fs.existsSync(manifestPath)) {
        fail(`plugin "${entry.name}": missing .claude-plugin/plugin.json at ${entry.source}`);
        continue;
      }
      validateLocalPlugin(pluginDir, manifestPath, entry.name);
      localPlugins.push({ name: entry.name, dir: path.relative(ROOT, pluginDir) });
    } else if (entry.source && typeof entry.source === "object") {
      if (!entry.source.source) {
        fail(`plugin "${entry.name}": source object missing "source" type field`);
      }
    } else {
      fail(`plugin "${entry.name}": invalid or missing "source"`);
    }
  }

  validateRenames(mkt.renames, seenNames);
  return localPlugins;
}

// The template is never registered in the catalog, but it is what every new
// plugin starts from — hold it to the same per-plugin rules.
function validateTemplate() {
  const manifestPath = path.join(ROOT, TEMPLATE_DIR, ".claude-plugin/plugin.json");
  if (!fs.existsSync(manifestPath)) return;
  validateLocalPlugin(path.join(ROOT, TEMPLATE_DIR), manifestPath, path.basename(TEMPLATE_DIR));
}

// Every published plugin folder needs an owner in CODEOWNERS: either the
// catch-all `*` or a line for its folder (docs/PLUGIN-GUIDELINES.md,
// CONTRIBUTING.md step 3).
function validateCodeowners(localPlugins) {
  const candidates = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"];
  const file = candidates.find((f) => fs.existsSync(path.join(ROOT, f)));
  if (!file) {
    if (localPlugins.length) fail(`no CODEOWNERS file — every plugin folder needs an owner`);
    return;
  }
  const patterns = fs
    .readFileSync(path.join(ROOT, file), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(/\s+/))
    .filter((parts) => parts.length > 1) // a pattern without owners un-assigns, it doesn't cover
    .map(([pattern]) => pattern.replace(/^\//, "").replace(/\/$/, ""));

  for (const { name, dir } of localPlugins) {
    const covered = patterns.some((p) => p === "*" || p === "plugins" || p === "plugins/*" || p === dir);
    if (!covered) fail(`plugin "${name}": no CODEOWNERS line covers ${dir}/`);
  }
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function compareSemver(a, b) {
  const x = parseSemver(a);
  const y = parseSemver(b);
  return x.major - y.major || x.minor - y.minor || x.patch - y.patch;
}

// Users only receive an update when the computed version changes
// (docs/RELEASES.md → "The version-bump gotcha"). So a PR that touches a
// published plugin's files must also raise its plugin.json version.
function validateVersionBumps(localPlugins, baseRef) {
  let mergeBase;
  try {
    mergeBase = git(["merge-base", baseRef, "HEAD"]).trim();
  } catch {
    fail(`--base "${baseRef}": no merge base with HEAD (in CI, checkout needs fetch-depth: 0)`);
    return;
  }

  for (const { name, dir } of localPlugins) {
    const changed = git(["diff", "--name-only", mergeBase, "--", dir]).trim();
    if (!changed) continue;

    let baseVersion;
    try {
      baseVersion = JSON.parse(git(["show", `${mergeBase}:${dir}/.claude-plugin/plugin.json`])).version;
    } catch {
      continue; // plugin is new in this PR — nothing to compare against
    }
    const headVersion = readJson(path.join(ROOT, dir, ".claude-plugin/plugin.json")).version;
    if (!baseVersion || !headVersion) continue; // missing version is reported elsewhere

    try {
      if (compareSemver(headVersion, baseVersion) <= 0) {
        fail(
          `plugin "${name}": files changed since ${baseRef} but version is ${headVersion} (base ${baseVersion}) — ` +
            `bump it with: node scripts/release.mjs --plugin ${name} --bump patch|minor|major`
        );
      }
    } catch {
      // malformed version strings are reported by validateLocalPlugin
    }
  }
}

// Hardcoded absolute paths in manifest/hook/MCP config files. Scoped to
// these filenames specifically (not README/CHANGELOG prose) to avoid false
// positives from documentation examples.
const PATH_SCAN_BASENAMES = new Set(["plugin.json", "marketplace.json", "hooks.json", ".mcp.json"]);
const ABS_PATH_RE = /(\/Users\/[^\s"']+|\/home\/[^\s"']+|\/root\/[^\s"']+|[A-Za-z]:\\[^\s"']+)/;
const ALLOWED_VARS = ["${CLAUDE_PLUGIN_ROOT}", "${CLAUDE_PLUGIN_DATA}", "${CLAUDE_PROJECT_DIR}"];

function scanAbsolutePaths(files) {
  for (const file of files) {
    if (!PATH_SCAN_BASENAMES.has(path.basename(file))) continue;
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    text.split("\n").forEach((line, i) => {
      const m = ABS_PATH_RE.exec(line);
      if (m && !ALLOWED_VARS.some((v) => line.includes(v))) {
        fail(
          `hardcoded absolute path in ${file}:${i + 1}: "${m[0]}" — use \${CLAUDE_PLUGIN_ROOT} or a relative "./" path instead`
        );
      }
    });
  }
}

// Best-effort secret scan (defense-in-depth alongside gitleaks in CI, which
// scans full git history — this only scans the current working tree).
const SECRET_PATTERNS = [
  { name: "AWS Access Key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub Token", re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: "Slack Token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Private Key Block", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Generic API Key", re: /(api|access)[_-]?key\s*[:=]\s*['"][A-Za-z0-9/+=_-]{16,}['"]/i },
];
const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".zip", ".pdf", ".woff", ".woff2"]);

function scanSecrets(files) {
  for (const file of files) {
    if (BINARY_EXT.has(path.extname(file).toLowerCase())) continue;
    let text;
    try {
      text = fs.readFileSync(path.join(ROOT, file), "utf8");
    } catch {
      continue; // unreadable / binary — skip
    }
    for (const { name, re } of SECRET_PATTERNS) {
      if (re.test(text)) {
        fail(`possible secret (${name}) found in ${file} — value masked here; please rotate and remove it`);
      }
    }
  }
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (err) {
  console.error(`✘ ${err.message}`);
  process.exit(2);
}

const localPlugins = validateMarketplace();
validateTemplate();
validateCodeowners(localPlugins);
if (args.base) validateVersionBumps(localPlugins, args.base);
const files = gitListFiles();
scanAbsolutePaths(files);
scanSecrets(files);

if (warnings.length) {
  console.warn(`\n⚠ ${warnings.length} warning(s):\n`);
  for (const w of warnings) console.warn(`  - ${w}`);
}
if (errors.length) {
  console.error(`\n✘ ${errors.length} custom validation error(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("");
  process.exit(1);
}
console.log("✔ Custom marketplace structural checks passed.");
