import { useEffect } from "react";
import type { Catalog } from "../lib/catalog";
import { href } from "../lib/router";
import { installCommand } from "../lib/config";
import { CopyButton } from "../components/CopyButton";
import { MiniCard } from "../components/Card";
import { KindBadge } from "../components/KindBadge";
import { MarkdownBody } from "../components/Markdown";
import { ExternalIcon } from "../components/Icons";
import { LoadError, NotFound } from "../components/States";
import { rememberRecent } from "../components/Palette";
import { t } from "../i18n";

export function PluginPage({ catalog, name }: { catalog: Catalog; name: string }) {
  const entry = catalog.status === "ready" ? catalog.search.get(`plugin:${name}`) : undefined;
  useEffect(() => {
    if (entry) {
      rememberRecent(entry.id);
      document.title = t.app.pageTitle(entry.displayName);
    }
  }, [entry]);

  if (catalog.status === "loading") return <DetailSkeleton />;
  if (catalog.status === "error") {
    return (
      <div className="container page">
        <LoadError message={catalog.message} />
      </div>
    );
  }
  if (!entry) return <NotFound what={t.plugin.notFound(name)} path={`/plugin/${name}`} />;

  const children = catalog.index.items.filter((i) => i.parentPlugin === entry.name);
  const counts = Object.entries(entry.components ?? {})
    .filter(([, n]) => n > 0)
    .map(([k, n]) => t.plugin.componentCount(n, k))
    .join(" · ");
  const command = entry.installCommand ?? installCommand(entry.name);
  const releases = catalog.releases.filter((r) => r.plugin === entry.name);
  const changelogUrl = releases[0]?.changelogUrl;

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label={t.plugin.breadcrumbAria}>
        <a href={href.home()}>{t.plugin.breadcrumbCatalog}</a>
        <span aria-hidden="true">/</span>
        <a href={href.search({ kind: "plugin" })}>{t.plugin.breadcrumbPlugins}</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{entry.name}</span>
      </nav>

      <div className="detail-head">
        <div className="detail-meta">
          <KindBadge kind="plugin" />
          {entry.version && <span className="version">v{entry.version}</span>}
          {entry.author?.name && (
            <span>
              {t.plugin.by} <strong>{entry.author.name}</strong>
            </span>
          )}
        </div>
        <h1 className="h1">{entry.displayName}</h1>
        {entry.description && <p className="lead">{entry.description}</p>}
        {entry.keywords.length > 0 && (
          <div className="tags">
            {entry.keywords.map((k) => (
              <a key={k} className="tag" href={href.search({ keyword: k })} style={{ fontSize: 13 }}>
                #{k}
              </a>
            ))}
          </div>
        )}
        <div className="install-row">
          <div className="install-cmd">
            <span aria-hidden="true" className="mono faint">
              ›
            </span>
            <code>{command}</code>
          </div>
          <CopyButton text={command} className="btn btn-primary" icon />
          <a className="btn" href={entry.githubUrl} target="_blank" rel="noopener noreferrer">
            {t.plugin.viewOnGitHub} <ExternalIcon />
          </a>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          {children.length > 0 && (
            <section aria-labelledby="comp-h" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 id="comp-h" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {t.plugin.components}{" "}
                <span className="faint" style={{ fontWeight: 400, fontSize: 15 }}>
                  · {counts}
                </span>
              </h2>
              <div className="mini-grid">
                {children.map((c) => (
                  <MiniCard key={c.id} entry={c} />
                ))}
              </div>
            </section>
          )}
          <article className="doc" aria-label={t.plugin.readmeAria}>
            <div className="doc-head">
              <span className="mono">{t.plugin.readmeFile}</span>
              <a href={`${entry.githubUrl.replace("/tree/", "/blob/")}/README.md`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
                {t.plugin.source}
              </a>
            </div>
            <div className="doc-body">
              {entry.bodyPath ? <MarkdownBody entry={entry} /> : <p className="muted" style={{ margin: 0 }}>{t.plugin.noReadme}</p>}
            </div>
          </article>
        </div>

        <aside className="detail-aside">
          <section className="aside-section" aria-labelledby="deps-h">
            <h2 id="deps-h" className="section-label">
              {t.plugin.dependsOn}
            </h2>
            {entry.dependencies && entry.dependencies.length > 0 ? (
              <ul className="list-box dep-list">
                {entry.dependencies.map((d) => (
                  <li key={d}>
                    {catalog.search.get(`plugin:${d}`) ? (
                      <a href={href.plugin(d)}>
                        <span>{d}</span>
                        <span aria-hidden="true" className="faint">
                          →
                        </span>
                      </a>
                    ) : (
                      <span className="plain">{d}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                {t.plugin.noDependencies}
              </p>
            )}
            {(() => {
              const usedBy = catalog.index.items.filter((i) => i.kind === "plugin" && i.dependencies?.includes(entry.name));
              return usedBy.length > 0 ? (
                <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                  {t.plugin.usedBy}
                  {usedBy.map((u, i) => (
                    <span key={u.name}>
                      {i > 0 && ", "}
                      <a className="mono" href={href.plugin(u.name)}>
                        {u.name}
                      </a>
                    </span>
                  ))}
                  {t.plugin.usedByTail}
                </p>
              ) : null;
            })()}
          </section>
          <section className="aside-section" aria-labelledby="det-h">
            <h2 id="det-h" className="section-label">
              {t.plugin.details}
            </h2>
            <dl className="dl">
              {entry.version && (
                <>
                  <dt>{t.plugin.version}</dt>
                  <dd className="mono">{entry.version}</dd>
                </>
              )}
              {entry.author?.name && (
                <>
                  <dt>{t.plugin.author}</dt>
                  <dd>{entry.author.name}</dd>
                </>
              )}
              <dt>{t.plugin.sourcePath}</dt>
              <dd className="mono">{entry.sourcePath}</dd>
              <dt>{t.plugin.sourceType}</dt>
              <dd className="mono">{entry.sourceType}</dd>
              {releases[0] && (
                <>
                  <dt>{t.plugin.released}</dt>
                  <dd className="mono">{releases[0].date}</dd>
                </>
              )}
            </dl>
            {changelogUrl && (
              <a href={changelogUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14 }}>
                {t.plugin.changelog}
              </a>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="container page" aria-busy="true" aria-label={t.states.loading}>
      <div className="skel" style={{ width: 240, height: 14 }} />
      <div className="detail-head">
        <div className="skel" style={{ width: 120, height: 22 }} />
        <div className="skel" style={{ width: "40%", height: 40 }} />
        <div className="skel" style={{ width: "60%", height: 18 }} />
        <div className="skel" style={{ width: "50%", height: 44 }} />
      </div>
    </div>
  );
}
