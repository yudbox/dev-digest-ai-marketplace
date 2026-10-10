#!/usr/bin/env node
// End-to-end smoke test: copies the marketplace into a temp directory,
// registers it with an isolated Claude Code config (CLAUDE_CONFIG_DIR), and
// installs every relative-path plugin from it. Catches what
// `claude plugin validate` can't — e.g. a `source` pointing at a missing
// directory only fails at install time.
//
// While the catalog is still empty, the template is registered as a
// throwaway plugin instead, so the add → install → list loop is exercised
// from day one. Never touches the user's real ~/.claude.
//
// Usage: node scripts/smoke-install.mjs   (needs the `claude` CLI on PATH)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";

const ROOT = process.cwd();
const TEMPLATE_DIR = "templates/example-plugin";

function copyTrackedFiles(dest) {
  const files = execSync("git ls-files --cached --others --exclude-standard", { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  for (const file of files) {
    const target = path.join(dest, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), target);
  }
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-smoke-"));
  const mktDir = path.join(tmp, "marketplace");
  const env = { ...process.env, CLAUDE_CONFIG_DIR: path.join(tmp, "config") };
  const claude = (...args) => execFileSync("claude", args, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  try {
    copyTrackedFiles(mktDir);

    const mktPath = path.join(mktDir, ".claude-plugin/marketplace.json");
    const mkt = JSON.parse(fs.readFileSync(mktPath, "utf8"));
    if (mkt.plugins.length === 0) {
      const name = path.basename(TEMPLATE_DIR);
      fs.cpSync(path.join(mktDir, TEMPLATE_DIR), path.join(mktDir, "plugins", name), { recursive: true });
      mkt.plugins = [{ name, source: `./plugins/${name}` }];
      fs.writeFileSync(mktPath, JSON.stringify(mkt, null, 2) + "\n");
      console.log(`… Catalog is empty — smoke-testing ${TEMPLATE_DIR} as "${name}"`);
    }

    claude("plugin", "marketplace", "add", mktDir);
    const expected = mkt.plugins.filter((p) => typeof p.source === "string").map((p) => `${p.name}@${mkt.name}`);
    for (const id of expected) {
      claude("plugin", "install", id);
      console.log(`✔ Installed ${id}`);
    }

    const listed = JSON.parse(claude("plugin", "list", "--json"));
    const missing = expected.filter((id) => !listed.some((p) => p.id === id && p.enabled));
    if (missing.length) throw new Error(`installed but not enabled: ${missing.join(", ")}`);
    console.log(`✔ Smoke install passed (${expected.length} plugin(s))`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

try {
  main();
} catch (err) {
  console.error(`✘ Smoke install failed: ${err.stderr?.trim() || err.message}`);
  process.exit(1);
}
