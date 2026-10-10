import { useEffect } from "react";
import type { Catalog } from "../lib/catalog";
import { href } from "../lib/router";
import { installCommand } from "../lib/config";
import { CommandBlock } from "../components/CopyButton";
import { KindBadge } from "../components/KindBadge";
import { MarkdownBody } from "../components/Markdown";
import { LoadError, NotFound } from "../components/States";
import { rememberRecent } from "../components/Palette";
import { DetailSkeleton } from "./Plugin";
import { t } from "../i18n";

export function ArtifactPage({ catalog, id }: { catalog: Catalog; id: string }) {
  const entry = catalog.status === "ready" ? catalog.search.get(id) : undefined;
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
  // A plugin id opened as an artifact: show the plugin page's not-found
  // equivalent rather than a half-empty component view.
  if (!entry || entry.kind === "plugin") return <NotFound what={t.artifact.notFound(id)} path={`/artifact/${id}`} />;

  const plugin = entry.parentPlugin ?? "";
  const parent = catalog.search.get(`plugin:${plugin}`);
  const hasDoc = !!entry.bodyPath;
  const fileName = entry.sourcePath.split("/").slice(2).join("/") || entry.sourcePath;

  const details: [string, string][] = [];
  if (entry.model) details.push([t.artifact.model, entry.model]);
  if (entry.hookEvents?.length) details.push([t.artifact.events, entry.hookEvents.join(", ")]);
  details.push([t.artifact.id, entry.id]);
  details.push([t.artifact.sourcePath, entry.sourcePath]);

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label={t.plugin.breadcrumbAria}>
        <a href={href.home()}>{t.plugin.breadcrumbCatalog}</a>
        <span aria-hidden="true">/</span>
        <a href={href.plugin(plugin)}>{plugin}</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{entry.name}</span>
      </nav>

      <div className="detail-head">
        <div className="detail-meta">
          <KindBadge kind={entry.kind} />
          <span>
            {t.artifact.partOf}{" "}
            <a className="mono" href={href.plugin(plugin)} style={{ fontWeight: 600 }}>
              {plugin}
            </a>
            {parent?.version && (
              <span className="mono faint" style={{ fontSize: 12.5 }}>
                {" "}
                v{parent.version}
              </span>
            )}
          </span>
        </div>
        <h1 className="h1">{entry.displayName}</h1>
        {entry.description && <p className="lead" style={{ whiteSpace: "pre-line" }}>{entry.description}</p>}
        <div className="cmd-pair">
          <div>
            <span className="cmd-pair-label">{entry.invocation ? t.artifact.invokeAfterInstall : t.artifact.howItRuns}</span>
            {entry.invocation ? (
              <CommandBlock command={entry.invocation} />
            ) : entry.kind === "hook" ? (
              <div className="note-box">
                <span>
                  {t.artifact.hookRunsOn}{" "}
                  <code className="mono" style={{ color: "var(--fg)" }}>
                    {entry.hookEvents?.join(", ") || t.artifact.hookEventsFallback}
                  </code>{" "}
                  {t.artifact.hookNothingToInvoke}
                </span>
              </div>
            ) : (
              <div className="note-box">{t.artifact.mcpAvailable}</div>
            )}
          </div>
          <div>
            <span className="cmd-pair-label">{t.artifact.installLabel}</span>
            <CommandBlock command={parent?.installCommand ?? installCommand(plugin)} label={t.copy.install} primary />
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          {hasDoc ? (
            <article className="doc" aria-label={t.artifact.definitionAria(entry.kind)}>
              <div className="doc-head">
                <span className="mono">{fileName}</span>
                <a href={entry.githubUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
                  {t.artifact.source}
                </a>
              </div>
              <div className="doc-body">
                <MarkdownBody entry={entry} />
              </div>
            </article>
          ) : (
            <div className="empty left">
              <h2 style={{ fontSize: 19 }}>{t.artifact.noDescriptionTitle(entry.kind)}</h2>
              <p>
                {entry.kind === "hook" ? (
                  <>
                    {t.artifact.hookListedFromBefore}
                    <span className="mono">{t.artifact.hookListedFromFile}</span>
                    {t.artifact.hookListedFromAfter}
                  </>
                ) : (
                  <>
                    {t.artifact.mcpListedFromBefore}
                    <span className="mono">{t.artifact.mcpListedFromFile}</span>
                    {t.artifact.mcpListedFromAfter}
                  </>
                )}
                {t.artifact.readmeHint}
              </p>
              <div className="actions" style={{ marginTop: 4 }}>
                <a className="btn" href={href.plugin(plugin)}>
                  {t.artifact.readPluginReadme(plugin)}
                </a>
                <a className="btn" href={entry.githubUrl} target="_blank" rel="noopener noreferrer">
                  {t.artifact.viewConfig(entry.kind)}
                </a>
              </div>
            </div>
          )}
        </div>
        <aside className="detail-aside">
          {entry.tools && entry.tools.length > 0 && (
            <section className="aside-section" aria-labelledby="tools-h">
              <h2 id="tools-h" className="section-label">
                {t.artifact.toolsTitle}
              </h2>
              <ul className="tool-list">
                {entry.tools.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>
                {t.artifact.toolsFromBefore}
                <code>{entry.kind === "skill" ? "allowed-tools:" : "tools:"}</code>
                {t.artifact.toolsFromAfter}
              </p>
            </section>
          )}
          <section className="aside-section" aria-labelledby="meta-h">
            <h2 id="meta-h" className="section-label">
              {t.artifact.details}
            </h2>
            <dl className="dl">
              {details.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{k}</dt>
                  <dd className="mono">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          {entry.keywords.length > 0 && (
            <section className="aside-section" aria-labelledby="kw-h">
              <h2 id="kw-h" className="section-label">
                {t.artifact.keywords}
              </h2>
              <div className="tags">
                {entry.keywords.map((k) => (
                  <a key={k} className="tag" href={href.search({ keyword: k })} style={{ fontSize: 13 }}>
                    #{k}
                  </a>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
