import { CatalogSearch, emptyFacets, highlightParts, queryTerms } from "../src/lib/search";
import type { IndexEntry } from "../src/lib/types";
import { demoCatalog } from "./helpers";

const entry = (over: Partial<IndexEntry>): IndexEntry => ({
  id: `skill:p/${over.name}`,
  kind: "skill",
  name: "x",
  displayName: "X",
  description: "",
  keywords: [],
  sourcePath: "",
  githubUrl: "",
  parentPlugin: "p",
  ...over,
});

describe("search", () => {
  it("AC-7: a name match ranks above a bodyText-only match", () => {
    const s = new CatalogSearch([
      entry({ name: "notes", displayName: "Notes", bodyText: "helps with refactoring code" }),
      entry({ name: "refactoring", displayName: "Refactoring" }),
    ]);
    expect(s.match("refactoring").map((e) => e.name)).toEqual(["refactoring", "notes"]);
  });

  it("AC-8: word prefix and one typo in 5+ letter words", () => {
    const s = new CatalogSearch([entry({ name: "r", displayName: "R", keywords: ["refactoring"] })]);
    expect(s.match("refac")).toHaveLength(1);
    expect(s.match("refactr")).toHaveLength(1);
  });

  it("AC-21: same facet OR, different facets AND", () => {
    const { index } = demoCatalog();
    const s = new CatalogSearch(index.items);
    const f = { ...emptyFacets(), kind: ["skill", "agent"], keyword: ["spec"] };
    const results = s.search("", f).results;
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => ["skill", "agent"].includes(e.kind) && e.keywords.includes("spec"))).toBe(true);
  });

  it("AC-20/22: browse mode with counts per facet value", () => {
    const { index } = demoCatalog();
    const s = new CatalogSearch(index.items);
    const { results, facets } = s.search("", { ...emptyFacets(), kind: ["agent"] });
    expect(results).toHaveLength(6);
    const kind = facets.find((g) => g.key === "kind")!;
    expect(kind.values.find((v) => v.value === "skill")!.count).toBe(3);
  });

  it("treats a filler-only query as browse, not 'nothing found'", () => {
    expect(queryTerms("I need a skill for")).toEqual([]);
    const { index } = demoCatalog();
    expect(new CatalogSearch(index.items).match("I need a skill for")).toHaveLength(index.items.length);
  });

  it("finds the design's example queries", () => {
    const s = new CatalogSearch(demoCatalog().index.items);
    expect(s.match("write a spec for a feature")[0].name).toMatch(/spec/);
    expect(s.match("review architecture")[0].name).toMatch(/architecture/);
  });

  it("AC-9: highlights matched word prefixes", () => {
    expect(highlightParts("Spec Creator", ["spec"])).toEqual([
      { text: "Spec", match: true },
      { text: " Creator", match: false },
    ]);
  });
});
