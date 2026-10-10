// Mirrors the files written by scripts/build-index.mjs. Keep SCHEMA_VERSION
// equal to the one there; a test checks it (AC-33).
export const SCHEMA_VERSION = 1;

export const KINDS = ["plugin", "skill", "agent", "command", "hook", "mcp"] as const;
export type Kind = (typeof KINDS)[number];


export interface Author {
  name: string;
  email?: string;
}

export interface IndexEntry {
  id: string;
  kind: Kind;
  name: string;
  displayName: string;
  description: string;
  keywords: string[];
  bodyText?: string;
  bodyPath?: string;
  sourcePath: string;
  githubUrl: string;
  author?: Author;
  // kind: plugin
  version?: string;
  installCommand?: string;
  sourceType?: string;
  dependencies?: string[];
  components?: { skills: number; agents: number; commands: number; hooks: number; mcp: number };
  // components
  parentPlugin?: string;
  invocation?: string;
  tools?: string[];
  model?: string;
  hookEvents?: string[];
}

export interface CatalogIndex {
  schemaVersion: number;
  generatedAt: string;
  marketplace: { name: string; description: string; owner: Author; repo: string };
  stats: Record<Kind, number>;
  items: IndexEntry[];
}

export interface Release {
  plugin: string;
  version: string;
  date: string;
  summary: string;
  changelogUrl: string;
}
