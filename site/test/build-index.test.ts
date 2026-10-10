// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { buildIndex, parseChangelog, parseFrontmatter, SCHEMA_VERSION, titleCase, cleanDescription, validateIndex, writeOutput } from "../../scripts/build-index.mjs";
import { SCHEMA_VERSION as SITE_SCHEMA_VERSION } from "../src/lib/types";
import { tempMarketplace } from "./helpers";

const SCRIPT = path.resolve(__dirname, "../../scripts/build-index.mjs");

const onePlugin = (extra: Record<string, string | object> = {}) =>
  tempMarketplace({
    ".claude-plugin/marketplace.json": { name: "mkt", owner: { name: "o" }, plugins: [{ name: "p", source: "./plugins/p" }] },
    "plugins/p/.claude-plugin/plugin.json": { name: "p", version: "2.3.4", description: "d", author: { name: "a" } },
    "plugins/p/skills/s1/SKILL.md": "---\nname: s1\ndescription: skill one\n---\nBody",
    "plugins/p/agents/a1.md": "---\nname: a1\ndescription: agent one\ntools: Read, Grep\nmodel: opus\n---\nBody",
    "plugins/p/hooks/hooks.json": { hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "${CLAUDE_PLUGIN_ROOT}/scripts/guard.sh" }] }] } },
    "plugins/p/.mcp.json": { mcpServers: { db: { command: "x" } } },
    ...extra,
  });

describe("build-index", () => {
  it("AC-1: one entry per plugin, skill, agent, hook and MCP server", () => {
    const { index } = buildIndex({ root: onePlugin() });
    expect(index.items.map((i) => `${i.kind}:${i.name}`).sort()).toEqual(
      ["agent:a1", "hook:guard", "mcp:db", "plugin:p", "skill:s1"].sort()
    );
    const agent = index.items.find((i) => i.kind === "agent")!;
    expect(agent.invocation).toBe("p:a1");
    expect(agent.tools).toEqual(["Read", "Grep"]);
    expect(index.items.find((i) => i.kind === "skill")!.invocation).toBe("/p:s1");
    expect(index.items.find((i) => i.kind === "hook")!.hookEvents).toEqual(["PreToolUse"]);
  });

  it("AC-2: writes a numeric schemaVersion equal to the site bundle's (AC-33)", () => {
    const { index } = buildIndex({ root: onePlugin() });
    expect(typeof index.schemaVersion).toBe("number");
    expect(SCHEMA_VERSION).toBe(SITE_SCHEMA_VERSION);
  });

  it("AC-3: an empty catalog produces a valid index and exits 0", () => {
    const root = tempMarketplace({ ".claude-plugin/marketplace.json": { name: "mkt", owner: { name: "o" }, plugins: [] } });
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-out-"));
    execFileSync("node", [SCRIPT, "--root", root, "--out", out]);
    const index = JSON.parse(fs.readFileSync(path.join(out, "index.json"), "utf8"));
    expect(index.items).toEqual([]);
    expect(validateIndex(index)).toEqual([]);
  });

  it("AC-4: schema errors name the entry", () => {
    const errors = validateIndex({ schemaVersion: 1, items: [{ id: "skill:p/x", kind: "skill", name: "x" }] });
    expect(errors.join("\n")).toMatch(/skill:p\/x: missing "description"/);
  });

  it("AC-5: plugin version comes from plugin.json", () => {
    const { index } = buildIndex({ root: onePlugin() });
    expect(index.items.find((i) => i.kind === "plugin")!.version).toBe("2.3.4");
  });

  it("AC-6: plugins renamed to null are not indexed", () => {
    const root = onePlugin({
      ".claude-plugin/marketplace.json": { name: "mkt", owner: { name: "o" }, renames: { p: null }, plugins: [{ name: "p", source: "./plugins/p" }] },
    });
    expect(buildIndex({ root }).index.items).toEqual([]);
  });

  it("AC-25: releases from all CHANGELOGs, newest first, without [Unreleased]", () => {
    const root = onePlugin({
      "plugins/p/CHANGELOG.md": "## [Unreleased]\n- wip\n\n## [1.1.0] - 2026-03-01\n- Added X\n\n## [1.0.0] - 2026-01-01\n- First\n",
      "CHANGELOG.md": "## [Unreleased]\n\n## [0.2.0] - 2026-02-01\n- Catalog update\n",
    });
    const { releases } = buildIndex({ root });
    expect(releases.map((r) => `${r.plugin}@${r.version}`)).toEqual(["p@1.1.0", "marketplace@0.2.0", "p@1.0.0"]);
    expect(releases[0].summary).toBe("Added X");
  });

  it("writes bodies/ for lazy detail views (AC-18)", () => {
    const result = buildIndex({ root: onePlugin() });
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-out-"));
    writeOutput(out, result);
    expect(fs.readFileSync(path.join(out, "bodies/agent/p/a1.md"), "utf8")).toBe("Body");
    const index = JSON.parse(fs.readFileSync(path.join(out, "index.json"), "utf8"));
    expect(index.items.find((i: { id: string }) => i.id === "agent:p/a1").bodyPath).toBe("bodies/agent/p/a1.md");
  });

  it("parses multi-line frontmatter and YAML lists", () => {
    const { data } = parseFrontmatter("---\nname: r\ndescription: |\n  Line one.\n  Line two.\ntools:\n  - Read\n  - Grep\n---\nx");
    expect(data.description).toBe("Line one.\nLine two.");
    expect(data.tools).toEqual(["Read", "Grep"]);
  });

  it("title-cases names with known acronyms and brands", () => {
    expect(titleCase("drizzle-orm-patterns")).toBe("Drizzle ORM Patterns");
    expect(titleCase("postgresql-table-design")).toBe("PostgreSQL Table Design");
    expect(titleCase("next-best-practices")).toBe("Next Best Practices");
    expect(titleCase("sdd-engineering")).toBe("SDD Engineering");
  });

  it("removes trigger phrases and <example> blocks from descriptions", () => {
    const raw = 'Use when a plan exists. Triggers: "implement", "build this". Covers ONE scope. <example> Context: x user: "y" </example>';
    expect(cleanDescription(raw)).toBe("Use when a plan exists. Covers ONE scope.");
  });

  it("parses changelog sections", () => {
    expect(parseChangelog("## [1.0.0] - 2026-10-10\n\n- **Initial** release\n")).toEqual([
      { version: "1.0.0", date: "2026-10-10", summary: "Initial release" },
    ]);
  });
});
