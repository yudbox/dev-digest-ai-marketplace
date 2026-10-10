import MiniSearch from "minisearch";
import { t } from "../i18n";
import type { IndexEntry, Kind } from "./types";

// Filler words people type in "I need a skill for X" queries. A query made
// only of them is treated as empty (browse), not as "nothing found".
const STOP_WORDS = new Set([
  "a", "an", "the", "i", "me", "my", "we", "need", "want", "looking", "find", "some", "something",
  "for", "to", "of", "and", "or", "with", "in", "on", "that", "which", "can", "how", "do",
  "is", "it", "skill", "agent", "plugin", "tool", "please",
]);

export function queryTerms(q: string): string[] {
  return (q || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !STOP_WORDS.has(w));
}

export type FacetKey = "kind" | "keyword" | "author" | "plugin";
export const FACET_KEYS: FacetKey[] = ["kind", "keyword", "author", "plugin"];
export type Facets = Record<FacetKey, string[]>;

export const emptyFacets = (): Facets => ({ kind: [], keyword: [], author: [], plugin: [] });

export function facetValues(e: IndexEntry, key: FacetKey): string[] {
  switch (key) {
    case "kind":
      return [e.kind];
    case "keyword":
      return e.keywords;
    case "author":
      return e.author?.name ? [e.author.name] : [];
    case "plugin":
      return [e.kind === "plugin" ? e.name : e.parentPlugin ?? ""].filter(Boolean);
  }
}

/** Same facet → OR, different facets → AND (AC-21). `skip` ignores one facet
 * so its own counts show what selecting another value would add. */
export function passesFacets(e: IndexEntry, f: Facets, skip?: FacetKey): boolean {
  return FACET_KEYS.every((key) => {
    if (key === skip || f[key].length === 0) return true;
    const values = facetValues(e, key);
    return f[key].some((v) => values.includes(v));
  });
}

export interface FacetGroup {
  key: FacetKey;
  title: string;
  values: { value: string; count: number; selected: boolean }[];
}

export class CatalogSearch {
  private mini: MiniSearch<IndexEntry & { keywordsText: string }>;
  private byId: Map<string, IndexEntry>;
  private vocabulary: string[];

  constructor(readonly items: IndexEntry[]) {
    this.byId = new Map(items.map((i) => [i.id, i]));
    this.mini = new MiniSearch({
      fields: ["displayName", "name", "keywordsText", "description", "bodyText"],
      storeFields: [],
      // Split kebab-case names too, so "refactor" finds "refactor-react".
      tokenize: (text) => text.split(/[^\p{L}\p{N}]+/u).filter(Boolean),
      searchOptions: {
        // displayName/name > keywords > description > bodyText (AC-7)
        boost: { displayName: 6, name: 6, keywordsText: 3, description: 2, bodyText: 1 },
        prefix: true,
        // One typo in words of 5+ characters (AC-8).
        fuzzy: (term) => (term.length >= 5 ? 1 : false),
        combineWith: "OR",
      },
    });
    const docs = items.map((i) => ({ ...i, keywordsText: i.keywords.join(" "), bodyText: i.bodyText ?? "" }));
    this.mini.addAll(docs);
    const vocab = new Set<string>();
    for (const d of docs) {
      for (const text of [d.displayName, d.name, d.keywordsText, d.description, d.bodyText]) {
        for (const w of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) if (w.length >= 4) vocab.add(w);
      }
    }
    this.vocabulary = [...vocab];
  }

  /** MiniSearch applies either a prefix or a typo to a term, not both. Add
   * indexed words whose beginning is one edit away from a 5+ letter term,
   * so "refactr" still finds "refactoring" (AC-8). */
  private expand(terms: string[]): string[] {
    const out = new Set(terms);
    for (const t of terms) {
      if (t.length < 5) continue;
      if (this.vocabulary.some((w) => w.startsWith(t))) continue;
      for (const w of this.vocabulary) {
        for (const len of [t.length - 1, t.length, t.length + 1]) {
          if (len <= w.length && withinOneEdit(t, w.slice(0, len))) {
            out.add(w);
            break;
          }
        }
      }
    }
    return [...out];
  }

  get(id: string): IndexEntry | undefined {
    return this.byId.get(id);
  }

  /** Ranked entries for a query; an empty (or filler-only) query → all. */
  match(q: string): IndexEntry[] {
    const terms = queryTerms(q);
    if (terms.length === 0) return this.items;
    return this.mini
      .search(this.expand(terms).join(" "))
      .map((r) => this.byId.get(String(r.id)))
      .filter((e): e is IndexEntry => !!e);
  }

  /** Full search: query → facet post-filter → results + facet counts. */
  search(q: string, f: Facets) {
    const base = this.match(q);
    const results = base.filter((e) => passesFacets(e, f));
    const facets: FacetGroup[] = FACET_KEYS.map((key) => {
      const counts = new Map<string, number>();
      for (const e of base) {
        if (!passesFacets(e, f, key)) continue;
        for (const v of facetValues(e, key)) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      for (const v of f[key]) if (!counts.has(v)) counts.set(v, 0);
      let values = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, count, selected: f[key].includes(value) }));
      if (key === "keyword") {
        // Keep the panel short; selected keywords always stay visible.
        values = values.filter((v, i) => i < 10 || v.selected);
      }
      return { key, title: t.search.facetTitles[key], values };
    });
    return { results, facets, terms: queryTerms(q) };
  }

  topKeywords(n: number): string[] {
    const counts = new Map<string, number>();
    for (const e of this.items) for (const k of e.keywords) counts.set(k, (counts.get(k) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, n)
      .map(([k]) => k);
  }
}

export function facetsFromParams(params: URLSearchParams): Facets {
  const f = emptyFacets();
  for (const key of FACET_KEYS) {
    f[key] = (params.get(key) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return f;
}

export function isKind(v: string): v is Kind {
  return ["plugin", "skill", "agent", "command", "hook", "mcp"].includes(v);
}

/** Splits text into plain and highlighted parts for the query terms (AC-9). */
export function highlightParts(text: string, terms: string[]): { text: string; match: boolean }[] {
  if (!terms.length || !text) return [{ text, match: false }];
  const escaped = [...terms].sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join("|")})`, "giu");
  const parts: { text: string; match: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ text: text.slice(last, i), match: false });
    parts.push({ text: m[0], match: true });
    last = i + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}

/** True when a and b differ by at most one insertion, deletion or substitution. */
export function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
