#!/usr/bin/env node
// Layer-2 structural validator for this marketplace repo.
// Covers what `claude plugin validate` does not: hard kebab-case enforcement,
// path existence, hardcoded absolute paths, and a secret-scanning fallback.
// Zero npm dependencies on purpose — this repo already needs Node in CI to
// run the Claude Code CLI, so no extra install step or supply-chain surface.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const errors = [];
const fail = (msg) => errors.push(msg);

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Names Anthropic reserves for its own marketplaces (code.claude.com/docs/en/plugin-marketplaces).
const RESERVED_NAMES = new Set([
  "claude-code-marketplace",
  "claude-code-plugins",
  "claude-plugins-official",
  "claude-plugins-community",
  "claude-community",
  "anthropic-marketplace",
  "anthropic-plugins",
  "agent-skills",
  "anthropic-agent-skills",
  "knowledge-work-plugins",
  "life-sciences",
  "claude-for-legal",
  "claude-for-financial-services",
  "financial-services-plugins",
  "first-party-plugins",
  "healthcare",
  "official-claude-plugins",
]);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
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

  if (!KEBAB.test(manifest.name)) {
    fail(`plugin.json name "${manifest.name}" in ${manifestPath} is not kebab-case`);
  }
  if (manifest.name !== entryName) {
    fail(
      `plugin.json name "${manifest.name}" does not match marketplace entry name "${entryName}" (${manifestPath})`
    );
  }

  for (const rel of collectRelativePaths(manifest)) {
    const resolved = path.resolve(pluginDir, rel);
    if (!fs.existsSync(resolved)) {
      fail(`plugin "${entryName}": referenced path "${rel}" does not exist (resolved ${resolved})`);
    }
  }
}

function validateMarketplace() {
  const mktPath = path.join(ROOT, ".claude-plugin/marketplace.json");
  if (!fs.existsSync(mktPath)) {
    fail(`Missing ${mktPath}`);
    return;
  }
  const mkt = readJson(mktPath);

  if (!KEBAB.test(mkt.name ?? "")) {
    fail(`marketplace.json name "${mkt.name}" is not kebab-case`);
  }
  if (RESERVED_NAMES.has(mkt.name)) {
    fail(`marketplace.json name "${mkt.name}" is a reserved Anthropic marketplace name`);
  }

  const seenNames = new Set();
  for (const entry of mkt.plugins ?? []) {
    if (!entry.name) {
      fail(`plugin entry missing "name": ${JSON.stringify(entry)}`);
      continue;
    }
    if (!KEBAB.test(entry.name)) {
      fail(`plugin entry "${entry.name}" is not kebab-case`);
    }
    if (RESERVED_NAMES.has(entry.name)) {
      fail(`plugin entry "${entry.name}" is a reserved Anthropic marketplace name`);
    }
    if (seenNames.has(entry.name)) {
      fail(`duplicate plugin name "${entry.name}" in marketplace.json`);
    }
    seenNames.add(entry.name);

    if (typeof entry.source === "string") {
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
    } else if (entry.source && typeof entry.source === "object") {
      if (!entry.source.source) {
        fail(`plugin "${entry.name}": source object missing "source" type field`);
      }
    } else {
      fail(`plugin "${entry.name}": invalid or missing "source"`);
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

validateMarketplace();
const files = gitListFiles();
scanAbsolutePaths(files);
scanSecrets(files);

if (errors.length) {
  console.error(`\n✘ ${errors.length} custom validation error(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("");
  process.exit(1);
}
console.log("✔ Custom marketplace structural checks passed.");
