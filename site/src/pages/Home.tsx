import { useState } from "react";
import type { Catalog } from "../lib/catalog";
import { ADD_MARKETPLACE } from "../lib/config";
import { href, navigate } from "../lib/router";
import { KINDS } from "../lib/types";
import { CommandBlock } from "../components/CopyButton";
import { KindBadge } from "../components/KindBadge";
import { SearchIcon } from "../components/Icons";
import { EmptyCatalog, LoadError } from "../components/States";
import { ReleaseRow } from "./WhatsNew";
import { t } from "../i18n";

export function Home({ catalog }: { catalog: Catalog }) {
  const [q, setQ] = useState("");
  const ready = catalog.status === "ready" ? catalog : null;
  const empty = ready?.index.items.length === 0;
  const keywords = ready ? ready.search.topKeywords(6) : [];

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-main">
            <p className="eyebrow">{t.home.eyebrow}</p>
            <h1 className="hero-title">{t.home.title}</h1>
            <p className="lead" style={{ maxWidth: "58ch" }}>
              {t.home.lead}
            </p>
            {!empty && (
              <>
                <form
                  role="search"
                  className="hero-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate(href.search({ q: q.trim() }));
                  }}
                >
                  <label htmlFor="hero-q" className="sr-only">
                    {t.home.searchLabel}
                  </label>
                  <div className="search-box">
                    <SearchIcon size={20} />
                    <input
                      id="hero-q"
                      type="search"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={t.home.searchPlaceholder}
                      autoComplete="off"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    {t.home.searchButton}
                  </button>
                </form>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="chips">
                    <span className="faint" style={{ fontSize: 13, marginRight: 4 }}>
                      {t.home.try}
                    </span>
                    {t.home.exampleQueries.map((ex) => (
                      <a key={ex} className="chip" href={href.search({ q: ex })}>
                        {ex}
                      </a>
                    ))}
                  </div>
                  {keywords.length > 0 && (
                    <div className="chips" style={{ gap: "6px 14px" }}>
                      <span className="faint" style={{ fontSize: 13 }}>
                        {t.home.popularKeywords}
                      </span>
                      {keywords.map((k) => (
                        <a key={k} className="tag" href={href.search({ keyword: k })} style={{ fontSize: 13 }}>
                          #{k}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <aside className="connect" aria-labelledby="connect-h">
            <h2 id="connect-h">{t.home.connectTitle}</h2>
            <p>{t.home.connectText}</p>
            <CommandBlock command={ADD_MARKETPLACE} />
            <a href={href.gettingStarted()} style={{ fontSize: 14, fontWeight: 500 }}>
              {t.home.connectLink}
            </a>
          </aside>
        </div>
      </section>

      {catalog.status === "loading" && <HomeSkeleton />}
      {catalog.status === "error" && (
        <div className="container" style={{ paddingTop: 48, paddingBottom: 64 }}>
          <LoadError message={catalog.message} />
        </div>
      )}
      {ready && empty && (
        <div className="container" style={{ paddingTop: 48, paddingBottom: 72 }}>
          <EmptyCatalog />
        </div>
      )}
      {ready && !empty && (
        <div className="container home-grid">
          <section className="home-stats" aria-labelledby="stats-h">
            <div className="section-head">
              <h2 id="stats-h" className="h2">
                {t.home.browseTitle}
              </h2>
              <span className="faint" style={{ fontSize: 13 }}>
                {t.home.browseHint}
              </span>
            </div>
            <div className="stats">
              {KINDS.map((kind) => {
                const n = ready.index.stats[kind] ?? 0;
                return (
                  <a key={kind} className="stat" href={href.search({ kind })} aria-label={t.home.browseAria(n, t.kinds[kind])}>
                    <span className={`stat-n${n === 0 ? " zero" : ""}`}>{n}</span>
                    <span className="stat-foot">
                      <KindBadge kind={kind} />
                      <span>{t.kinds[kind]}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
          <section className="home-new" aria-labelledby="new-h">
            <div className="section-head">
              <h2 id="new-h" className="h2">
                {t.home.whatsNewTitle}
              </h2>
              <a href={href.whatsNew()} style={{ fontSize: 14, fontWeight: 500 }}>
                {t.home.allReleases}
              </a>
            </div>
            {ready.releases.length ? (
              <ol className="list-box">
                {ready.releases.slice(0, 5).map((r) => (
                  <li key={`${r.plugin}@${r.version}`}>
                    <ReleaseRow release={r} search={ready.search} compact />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t.home.noReleases}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="container home-grid" aria-busy="true" aria-label={t.home.loadingAria}>
      <div className="home-stats">
        <div className="skel" style={{ width: 220, height: 22 }} />
        <div className="stats">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="stat">
              <div className="skel" style={{ width: 56, height: 38 }} />
              <div className="skel" style={{ width: "70%", height: 16 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="home-new">
        <div className="skel" style={{ width: 140, height: 22 }} />
        <div className="list-box" style={{ padding: "8px 16px" }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0" }}>
              <div className="skel" style={{ width: 80, height: 14 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="skel" style={{ width: "50%", height: 14 }} />
                <div className="skel" style={{ width: "85%", height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
