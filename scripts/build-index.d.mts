// Types for scripts/build-index.mjs, used by the site's tests (site/test).
// The script itself stays plain JavaScript with no npm dependencies.
import type { CatalogIndex, Release } from "../site/src/lib/types";

export const SCHEMA_VERSION: number;
export const KINDS: string[];
export function parseFrontmatter(text: string): { data: Record<string, unknown>; body: string };
export function parseChangelog(text: string): { version: string; date: string; summary: string }[];
export function stripMarkdown(md: string): string;
export function titleCase(name: string): string;
export function cleanDescription(text: unknown): string;
export function buildIndex(opts: { root: string; repo?: string; branch?: string; now?: Date }): {
  index: CatalogIndex;
  releases: Release[];
  bodies: Map<string, string>;
  warnings: string[];
};
export function validateIndex(index: unknown): string[];
export function writeOutput(outDir: string, result: unknown): void;
