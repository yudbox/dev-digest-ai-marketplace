import type { Catalog } from "../lib/catalog";
import type { CatalogSearch } from "../lib/search";
import type { Release } from "../lib/types";
import { href } from "../lib/router";
import { LoadError } from "../components/States";
import { t } from "../i18n";

/** One release; links to the plugin page when the plugin is in the index. */
export function ReleaseRow({ release, search, compact = false }: { release: Release; search: CatalogSearch; compact?: boolean }) {
  const inIndex = release.plugin !== "marketplace" && !!search.get(`plugin:${release.plugin}`);
  const name = inIndex ? (
    <a className="release-name" href={href.plugin(release.plugin)}>
      {release.plugin}
    </a>
  ) : (
    <span className="release-name">{release.plugin}</span>
  );
  if (compact) {
    return (
      <div className="release-row">
        <span className="release-date">{release.date}</span>
        <span className="release-head">
          {name}
          <span className="version">v{release.version}</span>
        </span>
        <span className="release-summary" title={release.summary}>
          {release.summary || t.whatsNew.noSummary}
        </span>
      </div>
    );
  }
  return (
    <div className="release-item">
      <div className="release-head">
        {name}
        <span className="version">v{release.version}</span>
        <a className="cl" href={release.changelogUrl} target="_blank" rel="noopener noreferrer">
          {t.whatsNew.changelog}
        </a>
      </div>
      <p>{release.summary || t.whatsNew.noSummary}</p>
    </div>
  );
}

export function WhatsNew({ catalog }: { catalog: Catalog }) {
  const groups = new Map<string, Release[]>();
  if (catalog.status === "ready") {
    for (const r of catalog.releases) groups.set(r.date, [...(groups.get(r.date) ?? []), r]);
  }
  return (
    <div className="container narrow page" style={{ paddingTop: 48, gap: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h1 className="h1" style={{ fontSize: 38 }}>
          {t.whatsNew.title}
        </h1>
        <p className="lead" style={{ fontSize: 16 }}>
          {t.whatsNew.lead}
        </p>
      </div>
      {catalog.status === "loading" && <div className="skel" style={{ height: 160, borderRadius: 10 }} aria-busy="true" />}
      {catalog.status === "error" && <LoadError message={catalog.message} />}
      {catalog.status === "ready" && groups.size === 0 && (
        <div className="empty left">
          <h2 style={{ fontSize: 22 }}>{t.whatsNew.emptyTitle}</h2>
          <p>{t.whatsNew.emptyText}</p>
          <pre className="mono" style={{ margin: 0, padding: "12px 14px", borderRadius: 6, background: "var(--code-bg)", border: "1px solid var(--line)", fontSize: 13 }}>
            {t.whatsNew.emptyExample}
          </pre>
          <p className="faint" style={{ fontSize: 13.5 }}>
            {t.whatsNew.emptyFootBefore}
            <span className="mono">{t.whatsNew.emptyFootCode}</span>
            {t.whatsNew.emptyFootAfter}
          </p>
        </div>
      )}
      {catalog.status === "ready" &&
        [...groups.entries()].map(([date, releases]) => (
          <section key={date} className="release-group" aria-label={t.whatsNew.groupAria(date)}>
            <h2>
              <time dateTime={date}>{date}</time>
            </h2>
            <ol className="list-box">
              {releases.map((r) => (
                <li key={`${r.plugin}@${r.version}`}>
                  <ReleaseRow release={r} search={catalog.search} />
                </li>
              ))}
            </ol>
          </section>
        ))}
    </div>
  );
}
