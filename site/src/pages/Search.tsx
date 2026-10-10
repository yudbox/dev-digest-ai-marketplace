import { useEffect, useMemo, useRef, useState } from "react";
import type { Catalog } from "../lib/catalog";
import { emptyFacets, facetsFromParams, FACET_KEYS, isKind, type FacetKey, type Facets } from "../lib/search";
import { href, navigate } from "../lib/router";
import { Card } from "../components/Card";
import { KindBadge } from "../components/KindBadge";
import { CloseIcon, SearchIcon } from "../components/Icons";
import { CardSkeletons, EmptyCatalog, LoadError } from "../components/States";
import { t } from "../i18n";


function toHash(q: string, f: Facets): string {
  return href.search({ q: q.trim() || undefined, ...Object.fromEntries(FACET_KEYS.map((k) => [k, f[k]])) });
}

export function SearchPage({ catalog, params }: { catalog: Catalog; params: URLSearchParams }) {
  // The URL is the source of truth for query and facets (AC-12); the input
  // keeps its own state so typing isn't interrupted by hash updates.
  const urlQ = params.get("q") ?? "";
  const facets = useMemo(() => facetsFromParams(params), [params]);
  const [q, setQ] = useState(urlQ);
  const lastPushed = useRef(urlQ);

  useEffect(() => {
    if (urlQ !== lastPushed.current) {
      setQ(urlQ);
      lastPushed.current = urlQ;
    }
  }, [urlQ]);

  const update = (nextQ: string, nextF: Facets, replace = true) => {
    lastPushed.current = nextQ.trim();
    navigate(toHash(nextQ, nextF), { replace });
  };

  const onType = (value: string) => {
    setQ(value);
    update(value, facets);
  };

  const toggle = (key: FacetKey, value: string) => {
    const next = { ...facets, [key]: facets[key].includes(value) ? facets[key].filter((v) => v !== value) : [...facets[key], value] };
    update(q, next, false);
  };

  const result = useMemo(
    () => (catalog.status === "ready" ? catalog.search.search(q, facets) : null),
    [catalog, q, facets]
  );

  const chips = FACET_KEYS.flatMap((key) => facets[key].map((value) => ({ key, value })));
  const n = result?.results.length ?? 0;
  const browsing = (result?.terms.length ?? 0) === 0;
  const kindSel = facets.kind.join(" + ");

  return (
    <div className="container page" style={{ gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label htmlFor="q" className="sr-only">
          {t.search.label}
        </label>
        <div className="search-box compact">
          <SearchIcon size={20} />
          <input
            id="q"
            type="search"
            value={q}
            onChange={(e) => onType(e.target.value)}
            placeholder={t.search.placeholder}
            autoComplete="off"
            autoFocus={!q}
          />
          {q && (
            <button type="button" className="icon-btn" style={{ border: 0, width: 36, height: 36, background: "transparent" }} aria-label={t.search.clear} onClick={() => onType("")}>
              <CloseIcon />
            </button>
          )}
        </div>
        <div className="search-meta">
          <p aria-live="polite">
            {catalog.status === "loading" ? (
              <strong>{t.search.searching}</strong>
            ) : browsing ? (
              <>
                <strong>{t.search.browsing(n)}</strong> {kindSel ? t.search.ofKind(kindSel) : t.search.inCatalog}
              </>
            ) : (
              <>
                <strong>{t.search.results(n)}</strong> {t.search.forQuery(q.trim())}
              </>
            )}
          </p>
          <code title={t.search.shareableLink}>{toHash(q, facets)}</code>
        </div>
        {chips.length > 0 && (
          <div className="chips">
            {chips.map(({ key, value }) => (
              <button key={`${key}:${value}`} type="button" className="chip chip-filter" aria-label={t.search.removeFilter(key, value)} onClick={() => toggle(key, value)}>
                {key}: {value} <CloseIcon size={12} />
              </button>
            ))}
            <button type="button" className="link-btn" onClick={() => update(q, emptyFacets(), false)}>
              {t.search.clearAll}
            </button>
          </div>
        )}
      </div>

      {catalog.status === "error" && <LoadError message={catalog.message} />}
      {catalog.status === "ready" && catalog.index.items.length === 0 && <EmptyCatalog />}
      {catalog.status !== "error" && !(catalog.status === "ready" && catalog.index.items.length === 0) && (
        <div className="search-layout">
          <aside className="facets" aria-label={t.search.filtersAria}>
            {result
              ? result.facets
                  .filter((g) => g.values.length > 0)
                  .map((g) => (
                    <fieldset key={g.key} className="facet">
                      <legend className="section-label">{g.title}</legend>
                      {g.values.map((v) => (
                        <label key={v.value} className="facet-row">
                          <input type="checkbox" checked={v.selected} onChange={() => toggle(g.key, v.value)} />
                          {g.key === "kind" && isKind(v.value) ? (
                            <>
                              <KindBadge kind={v.value} />
                              <span style={{ flex: 1 }} />
                            </>
                          ) : (
                            <span className={`facet-label${g.key === "author" ? " sans" : ""}`}>{v.value}</span>
                          )}
                          <span className="facet-count" aria-label={t.search.facetCountAria(v.count)}>
                            {v.count}
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  ))
              : Array.from({ length: 4 }, (_, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="skel" style={{ width: 70, height: 12 }} />
                    <div className="skel" style={{ width: "80%", height: 16 }} />
                    <div className="skel" style={{ width: "60%", height: 16 }} />
                  </div>
                ))}
          </aside>
          <section className="results" aria-label={t.search.resultsAria}>
            {!result && <CardSkeletons />}
            {result && n > 0 && (
              <div className="card-grid">
                {result.results.map((e) => (
                  <Card key={e.id} entry={e} terms={result.terms} />
                ))}
              </div>
            )}
            {result && n === 0 && (
              <div className="panel" style={{ maxWidth: "none", padding: "40px 32px" }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{t.search.noResultsTitle}</h2>
                <p className="muted" style={{ margin: 0, maxWidth: "60ch" }}>
                  {q.trim() ? t.search.noResultsQuery(q.trim()) : t.search.noResultsFilters}
                  {t.search.noResultsHint}
                </p>
                <div className="chips" style={{ marginTop: 4 }}>
                  <span className="faint" style={{ fontSize: 13 }}>
                    {t.search.try}
                  </span>
                  {t.search.suggestions.map((s) => (
                    <button key={s} type="button" className="chip" onClick={() => onType(s)}>
                      {s}
                    </button>
                  ))}
                </div>
                <a href={href.search()} onClick={(e) => { e.preventDefault(); setQ(""); update("", emptyFacets(), false); }} style={{ marginTop: 8, fontSize: 14, fontWeight: 500 }}>
                  {t.search.browseEverything}
                </a>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
