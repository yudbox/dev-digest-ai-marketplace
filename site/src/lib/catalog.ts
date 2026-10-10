import { useEffect, useState } from "react";
import { loadIndex, loadReleases, SchemaMismatchError } from "./data";
import { CatalogSearch } from "./search";
import type { CatalogIndex, Release } from "./types";

export type Catalog =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; index: CatalogIndex; search: CatalogSearch; releases: Release[] };

/** Loads index.json + releases.json once and builds the search index. */
export function useCatalog(): Catalog {
  const [catalog, setCatalog] = useState<Catalog>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    Promise.all([loadIndex(), loadReleases().catch(() => [])])
      .then(([index, releases]) => {
        if (alive) setCatalog({ status: "ready", index, search: new CatalogSearch(index.items), releases });
      })
      .catch((err: Error) => {
        if (!alive) return;
        if (err instanceof SchemaMismatchError) setCatalog({ status: "loading" });
        else setCatalog({ status: "error", message: err.message });
      });
    return () => {
      alive = false;
    };
  }, []);
  return catalog;
}
