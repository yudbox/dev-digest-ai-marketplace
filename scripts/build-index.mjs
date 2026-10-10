#!/usr/bin/env node
// Builds the static data files of the catalog site (site/) from the
// marketplace sources: index.json (search index), releases.json (What's new)
// and bodies/** (markdown for detail views, loaded lazily). Built-in Node
// modules only, like validate-marketplace.mjs. It reads plugin files and
// never executes them. See docs/specs/SPEC-2026-10-10-catalog-site.md.
//
// Usage:
//   node scripts/build-index.mjs [--root <marketplace dir>] [--out <dir>]
//                                [--repo owner/name] [--branch main]
//
// Defaults: --root = cwd, --out = <root>/site/public, --repo from
// $GITHUB_REPOSITORY (else yudbox/dev-digest-ai-marketplace), --branch from
// $GITHUB_REF_NAME (else main).

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Bump on any incompatible change to index.json; the site bundle carries the
// same number (site/src/lib/types.ts) and reloads when they differ (AC-33).
export const SCHEMA_VERSION = 1;

export const KINDS = ["plugin", "skill", "agent", "command", "hook", "mcp"];
const BODY_TEXT_LIMIT = 2000;
const DEFAULT_REPO = "yudbox/dev-digest-ai-marketplace";

// ---------------------------------------------------------------------------
// Small parsers

/** Minimal YAML frontmatter parser for top-level keys: `key: value`, inline
 * `[a, b]` lists, block `- item` lists, block scalars (`|`, `>`) and plain
 * values continued on indented lines. Nested maps are read as text. Enough
 * for SKILL.md / agent / command frontmatter. */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: {}, body: text };
  const data = {};
  let current = null; // { key, style: "literal" | "folded" | "plain", items, lines }
  const flush = () => {
    if (!current) return;
    if (current.items.length) data[current.key] = current.items;
    else if (current.lines.length) {
      const joined = current.style === "literal" ? current.lines.join("\n") : current.lines.join(" ");
      data[current.key] = unquote(joined.trim());
    } else if (!(current.key in data)) data[current.key] = "";
    current = null;
  };
  for (const raw of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):(?:\s+(.*))?$/.exec(raw);
    if (kv) {
      flush();
      const [, key, rest = ""] = kv;
      const value = rest.trim();
      if (/^[|>][+-]?$/.test(value) || value === "") {
        current = { key, style: value.startsWith("|") ? "literal" : "folded", items: [], lines: [] };
      } else if (value.startsWith("[") && value.endsWith("]")) {
        data[key] = value
          .slice(1, -1)
          .split(",")
          .map((s) => unquote(s.trim()))
          .filter(Boolean);
      } else {
        data[key] = value;
        current = { key, style: "plain", items: [], lines: [value] };
      }
      continue;
    }
    if (!current || raw.trim().startsWith("#")) continue;
    const item = /^\s*-\s+(.*)$/.exec(raw);
    if (item && current.style !== "literal" && current.lines.length === 0) {
      current.items.push(unquote(item[1].trim()));
    } else if (/^\s/.test(raw) || raw === "") {
      current.lines.push(raw.trim());
    }
  }
  flush();
  return { data, body: text.slice(m[0].length) };
}

function unquote(s) {
  return s.replace(/^(['"])(.*)\1$/, "$2");
}

/** `tools: Read, Grep` or `[Read, Grep]` or a block list → string[]. */
function toList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Markdown → plain text for the search index. */
export function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^[#>\-*+\s]+/gm, "")
    .replace(/[*_~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Words that Title Case would get wrong ("Postgresql", "Orm"). A
// `displayName` in plugin.json or in frontmatter always wins over this.
const WORD_CASE = {
  ai: "AI", api: "API", aws: "AWS", ci: "CI", cli: "CLI", css: "CSS", db: "DB", di: "DI",
  ears: "EARS", graphql: "GraphQL", html: "HTML", http: "HTTP", json: "JSON", jwt: "JWT",
  llm: "LLM", mcp: "MCP", nextjs: "Next.js", nodejs: "Node.js", orm: "ORM", owasp: "OWASP",
  postgresql: "PostgreSQL", pr: "PR", rsc: "RSC", rtl: "RTL", sdd: "SDD", sql: "SQL",
  typescript: "TypeScript", javascript: "JavaScript", ui: "UI", url: "URL", ux: "UX",
};

export function titleCase(name) {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => WORD_CASE[w.toLowerCase()] ?? w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** Agent/skill descriptions are written for Claude: they carry trigger
 * phrases and <example> dialogues. The catalog shows a human description
 * (those removed) and keeps the full text searchable via bodyText. */
export function cleanDescription(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/<example>[\s\S]*?(<\/example>|$)/gi, " ")
    .replace(/\bTriggers?:\s*(?:(?:"[^"]*"|'[^']*'|“[^”]*”)\s*(?:,|or|and)?\s*)+\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchText(rawDescription, body) {
  return `${rawDescription ?? ""} ${stripMarkdown(body)}`.trim().slice(0, BODY_TEXT_LIMIT);
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readTextIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

// ---------------------------------------------------------------------------
// CHANGELOG → releases

const RELEASE_HEADING = /^##\s+\[(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]\s*-\s*(\d{4}-\d{2}-\d{2})\s*$/;

/** Parses `## [x.y.z] - YYYY-MM-DD` sections; `[Unreleased]` is skipped. */
export function parseChangelog(text) {
  const releases = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      const m = RELEASE_HEADING.exec(line);
      current = m ? { version: m[1], date: m[2], summary: "" } : null;
      if (current) releases.push(current);
      continue;
    }
    if (current && !current.summary) {
      const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
      if (bullet) current.summary = stripMarkdown(bullet[1]);
    }
  }
  return releases;
}

// ---------------------------------------------------------------------------
// Index builder

export function buildIndex({ root, repo = DEFAULT_REPO, branch = "main", now = new Date() }) {
  const warnings = [];
  const items = [];
  const bodies = new Map(); // bodyPath -> markdown
  const releases = [];

  const ghUrl = (relPath, isDir) =>
    `https://github.com/${repo}/${isDir ? "tree" : "blob"}/${branch}/${toPosix(relPath)}`;

  const manifestPath = path.join(root, ".claude-plugin/marketplace.json");
  const marketplace = readJsonIfExists(manifestPath);
  if (!marketplace) throw new Error(`No marketplace manifest at ${manifestPath}`);
  const marketplaceName = marketplace.name;
  const removed = new Set(
    Object.entries(marketplace.renames ?? {})
      .filter(([, to]) => to === null)
      .map(([from]) => from)
  );

  const addBody = (bodyPath, markdown) => {
    bodies.set(bodyPath, markdown);
    return bodyPath;
  };

  for (const entry of marketplace.plugins ?? []) {
    if (!entry?.name || removed.has(entry.name)) continue;
    const source = entry.source;
    const isRelative = typeof source === "string";
    const installCommand = `/plugin install ${entry.name}@${marketplaceName}`;

    if (!isRelative) {
      // Remote source: its files aren't in this repo, so the entry is built
      // from the marketplace fields only and components aren't indexed.
      items.push({
        id: `plugin:${entry.name}`,
        kind: "plugin",
        name: entry.name,
        displayName: entry.displayName ?? titleCase(entry.name),
        description: entry.description ?? "",
        keywords: entry.keywords ?? entry.tags ?? [],
        sourcePath: ".claude-plugin/marketplace.json",
        githubUrl: ghUrl(".claude-plugin/marketplace.json", false),
        version: entry.version ?? "",
        author: entry.author ?? marketplace.owner ?? { name: "unknown" },
        installCommand,
        sourceType: source?.source ?? "url",
        dependencies: [],
        components: { skills: 0, agents: 0, commands: 0, hooks: 0, mcp: 0 },
      });
      continue;
    }

    const pluginRel = path.normalize(source);
    const pluginDir = path.join(root, pluginRel);
    const manifest = readJsonIfExists(path.join(pluginDir, ".claude-plugin/plugin.json"));
    if (!manifest) {
      warnings.push(`${entry.name}: no .claude-plugin/plugin.json in ${pluginRel} — skipped`);
      continue;
    }

    const plugin = entry.name;
    const author = manifest.author ?? entry.author ?? marketplace.owner ?? { name: "unknown" };
    const components = { skills: 0, agents: 0, commands: 0, hooks: 0, mcp: 0 };
    const children = [];

    const componentBase = (kind, name, relPath, isDir) => ({
      id: `${kind}:${plugin}/${name}`,
      kind,
      name,
      displayName: titleCase(name),
      parentPlugin: plugin,
      author,
      sourcePath: toPosix(relPath),
      githubUrl: ghUrl(relPath, isDir),
    });

    // Skills: <dir>/SKILL.md under skills/ (plus manifest-declared dirs).
    for (const skillsDir of componentDirs(manifest.skills, "skills")) {
      const abs = path.join(pluginDir, skillsDir);
      if (!fs.existsSync(abs)) continue;
      for (const name of fs.readdirSync(abs).sort()) {
        const file = path.join(abs, name, "SKILL.md");
        const text = readTextIfExists(file);
        if (text === null) continue;
        const { data, body } = parseFrontmatter(text);
        const skillName = data.name || name;
        children.push({
          ...componentBase("skill", skillName, path.join(pluginRel, skillsDir, name), true),
          ...(data.displayName ? { displayName: String(data.displayName) } : {}),
          description: cleanDescription(data.description),
          keywords: toList(data.keywords ?? data.tags),
          bodyText: searchText(data.description, body),
          bodyPath: addBody(`bodies/skill/${plugin}/${skillName}.md`, body),
          invocation: `/${plugin}:${skillName}`,
          tools: toList(data["allowed-tools"] ?? data.tools),
        });
        components.skills++;
      }
    }

    // Agents and commands: one markdown file each.
    for (const [kind, key, counter] of [
      ["agent", "agents", "agents"],
      ["command", "commands", "commands"],
    ]) {
      for (const dir of componentDirs(manifest[key], key)) {
        const abs = path.join(pluginDir, dir);
        if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) continue;
        for (const fileName of fs.readdirSync(abs).sort()) {
          if (!fileName.endsWith(".md")) continue;
          const text = fs.readFileSync(path.join(abs, fileName), "utf8");
          const { data, body } = parseFrontmatter(text);
          const name = data.name || fileName.slice(0, -3);
          const rel = path.join(pluginRel, dir, fileName);
          children.push({
            ...componentBase(kind, name, rel, false),
            ...(data.displayName ? { displayName: String(data.displayName) } : {}),
            description: cleanDescription(data.description),
            keywords: toList(data.keywords ?? data.tags),
            bodyText: searchText(data.description, body),
            bodyPath: addBody(`bodies/${kind}/${plugin}/${name}.md`, body),
            invocation: kind === "agent" ? `${plugin}:${name}` : `/${plugin}:${name}`,
            tools: toList(kind === "agent" ? data.tools : data["allowed-tools"] ?? data.tools),
            ...(data.model ? { model: String(data.model) } : {}),
          });
          components[counter]++;
        }
      }
    }

    // Hooks: one entry per handler in hooks/hooks.json, named after its script.
    const hooksRel = path.join(pluginRel, "hooks/hooks.json");
    const hooksJson = readJsonIfExists(path.join(root, hooksRel));
    if (hooksJson?.hooks && typeof hooksJson.hooks === "object") {
      const byName = new Map();
      for (const [event, groups] of Object.entries(hooksJson.hooks)) {
        for (const group of Array.isArray(groups) ? groups : []) {
          for (const handler of group?.hooks ?? []) {
            const base = hookName(handler) ?? `${event}-${byName.size + 1}`;
            const hook = byName.get(base) ?? { events: new Set(), description: handler.description ?? "" };
            hook.events.add(event);
            byName.set(base, hook);
          }
        }
      }
      for (const [name, hook] of byName) {
        children.push({
          ...componentBase("hook", name, hooksRel, false),
          description: hook.description,
          keywords: [],
          hookEvents: [...hook.events],
        });
        components.hooks++;
      }
    }

    // MCP servers: .mcp.json at the plugin root, or inline in plugin.json.
    const mcpRel = path.join(pluginRel, ".mcp.json");
    const mcpJson = readJsonIfExists(path.join(root, mcpRel));
    const servers = {
      ...(mcpJson?.mcpServers ?? {}),
      ...(typeof manifest.mcpServers === "object" && !Array.isArray(manifest.mcpServers) ? manifest.mcpServers : {}),
    };
    for (const [name, server] of Object.entries(servers)) {
      children.push({
        ...componentBase("mcp", name, mcpJson ? mcpRel : path.join(pluginRel, ".claude-plugin/plugin.json"), false),
        description: typeof server?.description === "string" ? server.description : "",
        keywords: [],
      });
      components.mcp++;
    }

    const readme = readTextIfExists(path.join(pluginDir, "README.md"));
    items.push({
      id: `plugin:${plugin}`,
      kind: "plugin",
      name: plugin,
      displayName: manifest.displayName ?? entry.displayName ?? titleCase(plugin),
      description: manifest.description ?? entry.description ?? "",
      keywords: manifest.keywords ?? entry.keywords ?? [],
      ...(readme !== null
        ? {
            bodyText: stripMarkdown(readme).slice(0, BODY_TEXT_LIMIT),
            bodyPath: addBody(`bodies/plugin/${plugin}.md`, readme),
          }
        : {}),
      sourcePath: toPosix(pluginRel),
      githubUrl: ghUrl(pluginRel, true),
      version: manifest.version ?? "", // plugin.json only (AC-5)
      author,
      installCommand,
      sourceType: "path",
      dependencies: dependencyNames(manifest.dependencies),
      components,
    });
    items.push(...children);

    const changelogRel = path.join(pluginRel, "CHANGELOG.md");
    const changelog = readTextIfExists(path.join(root, changelogRel));
    if (changelog) {
      for (const r of parseChangelog(changelog)) {
        releases.push({ plugin, ...r, changelogUrl: ghUrl(changelogRel, false) });
      }
    }
  }

  const rootChangelog = readTextIfExists(path.join(root, "CHANGELOG.md"));
  if (rootChangelog) {
    for (const r of parseChangelog(rootChangelog)) {
      releases.push({ plugin: "marketplace", ...r, changelogUrl: ghUrl("CHANGELOG.md", false) });
    }
  }
  releases.sort((a, b) => b.date.localeCompare(a.date) || a.plugin.localeCompare(b.plugin));

  const stats = Object.fromEntries(KINDS.map((k) => [k, items.filter((i) => i.kind === k).length]));
  const index = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: now.toISOString(),
    marketplace: {
      name: marketplaceName,
      description: marketplace.description ?? "",
      owner: marketplace.owner ?? { name: "unknown" },
      repo,
    },
    stats,
    items,
  };
  return { index, releases, bodies, warnings };
}

function componentDirs(declared, fallback) {
  const dirs = new Set([fallback]);
  for (const d of Array.isArray(declared) ? declared : typeof declared === "string" ? [declared] : []) {
    if (typeof d === "string" && d.startsWith("./") && !d.endsWith(".md") && !d.endsWith(".json")) {
      dirs.add(path.normalize(d));
    }
  }
  return [...dirs];
}

function hookName(handler) {
  const cmd = typeof handler?.command === "string" ? handler.command : "";
  const script = cmd.split(/\s+/).find((part) => /\.(sh|js|mjs|cjs|py|ts|rb)["']?$/.test(part));
  if (!script) return null;
  return path.basename(script.replace(/["']/g, "")).replace(/\.[^.]+$/, "");
}

function dependencyNames(deps) {
  if (!Array.isArray(deps)) return [];
  return deps
    .map((d) => (typeof d === "string" ? d : d?.name))
    .filter((d) => typeof d === "string" && d)
    .map((d) => d.split("@")[0]);
}

// ---------------------------------------------------------------------------
// Schema validation (AC-4)

const REQUIRED = ["id", "kind", "name", "displayName", "description", "keywords", "sourcePath", "githubUrl"];
const REQUIRED_PLUGIN = ["version", "author", "installCommand", "sourceType", "dependencies", "components"];

export function validateIndex(index) {
  const errors = [];
  if (typeof index.schemaVersion !== "number") errors.push("schemaVersion must be a number");
  if (!Array.isArray(index.items)) errors.push("items must be an array");
  const ids = new Set();
  for (const item of index.items ?? []) {
    const id = item?.id ?? "<no id>";
    for (const field of REQUIRED) {
      if (item?.[field] === undefined || item?.[field] === null) errors.push(`${id}: missing "${field}"`);
    }
    if (!KINDS.includes(item?.kind)) errors.push(`${id}: unknown kind "${item?.kind}"`);
    if (!Array.isArray(item?.keywords)) errors.push(`${id}: "keywords" must be an array`);
    if (item?.kind === "plugin") {
      for (const field of REQUIRED_PLUGIN) {
        if (item[field] === undefined || item[field] === null) errors.push(`${id}: missing "${field}"`);
      }
    } else if (item && !item.parentPlugin) {
      errors.push(`${id}: missing "parentPlugin"`);
    }
    if (ids.has(id)) errors.push(`${id}: duplicate id`);
    ids.add(id);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Output

export function writeOutput(outDir, { index, releases, bodies }) {
  fs.mkdirSync(outDir, { recursive: true });
  const bodiesDir = path.join(outDir, "bodies");
  fs.rmSync(bodiesDir, { recursive: true, force: true });
  for (const [rel, markdown] of bodies) {
    const file = path.join(outDir, rel);
    if (!path.resolve(file).startsWith(path.resolve(bodiesDir) + path.sep)) {
      throw new Error(`body path escapes the output dir: ${rel}`);
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, markdown);
  }
  fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index) + "\n");
  fs.writeFileSync(path.join(outDir, "releases.json"), JSON.stringify(releases) + "\n");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") args.root = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--repo") args.repo = argv[++i];
    else if (a === "--branch") args.branch = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root ?? process.cwd());
  const out = path.resolve(args.out ?? path.join(root, "site/public"));
  const repo = args.repo ?? process.env.GITHUB_REPOSITORY ?? DEFAULT_REPO;
  const branch = args.branch ?? process.env.GITHUB_REF_NAME ?? "main";

  const result = buildIndex({ root, repo, branch });
  for (const w of result.warnings) console.warn(`⚠ ${w}`);
  const errors = validateIndex(result.index);
  if (errors.length) {
    console.error(`✘ index.json failed schema validation (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  writeOutput(out, result);
  const s = result.index.stats;
  console.log(
    `✔ ${path.relative(process.cwd(), out) || "."}/index.json: ${result.index.items.length} entries ` +
      `(${s.plugin} plugins, ${s.skill} skills, ${s.agent} agents, ${s.command} commands, ${s.hook} hooks, ${s.mcp} MCP), ` +
      `${result.releases.length} releases, ${result.bodies.size} bodies`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (err) {
    console.error(`✘ ${err.message}`);
    process.exit(1);
  }
}
