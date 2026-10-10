import { SCHEMA_VERSION, type CatalogIndex, type IndexEntry, type Release } from "./types";

const RELOAD_FLAG = "catalog-schema-reload";

/** Relative to the page, so the build works under any GitHub Pages path. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

export class SchemaMismatchError extends Error {}

/** Loads index.json. A schema the bundle doesn't know means a stale tab
 * during a deploy: reload once to get the new bundle (AC-33). */
export async function loadIndex(fetchFn: typeof fetch = fetch): Promise<CatalogIndex> {
  const res = await fetchFn(assetUrl("index.json"), { cache: "no-cache" });
  if (!res.ok) throw new Error(`GET ./index.json → ${res.status} ${res.statusText}`.trim());
  const index = (await res.json()) as CatalogIndex;
  if (index.schemaVersion !== SCHEMA_VERSION) {
    let alreadyReloaded = false;
    try {
      alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === String(index.schemaVersion);
      sessionStorage.setItem(RELOAD_FLAG, String(index.schemaVersion));
    } catch {
      /* storage unavailable: still reload once per page load */
    }
    if (!alreadyReloaded) window.location.reload();
    throw new SchemaMismatchError(
      `index.json has schema v${index.schemaVersion}, this page expects v${SCHEMA_VERSION}`
    );
  }
  return index;
}

export async function loadReleases(fetchFn: typeof fetch = fetch): Promise<Release[]> {
  const res = await fetchFn(assetUrl("releases.json"), { cache: "no-cache" });
  if (!res.ok) return [];
  return (await res.json()) as Release[];
}

const bodyCache = new Map<string, Promise<string>>();

/** Markdown of a detail view, fetched only when that view opens (AC-18). */
export function loadBody(entry: IndexEntry): Promise<string> | null {
  if (!entry.bodyPath) return null;
  let p = bodyCache.get(entry.bodyPath);
  if (!p) {
    p = fetch(assetUrl(entry.bodyPath)).then((r) => {
      if (!r.ok) throw new Error(`GET ./${entry.bodyPath} → ${r.status}`);
      return r.text();
    });
    p.catch(() => bodyCache.delete(entry.bodyPath!));
    bodyCache.set(entry.bodyPath, p);
  }
  return p;
}
