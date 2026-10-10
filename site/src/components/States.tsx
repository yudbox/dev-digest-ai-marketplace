import { CONTRIBUTING_URL, REPO_URL } from "../lib/config";
import { href } from "../lib/router";
import { t } from "../i18n";
import { AlertIcon } from "./Icons";

export function LoadError({ message }: { message: string }) {
  return (
    <div className="panel" role="alert">
      <div className="error-title">
        <AlertIcon />
        <h2>{t.states.loadErrorTitle}</h2>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {t.states.loadErrorText}
      </p>
      <code className="error-code">{message}</code>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {t.states.tryAgain}
        </button>
        <a className="btn" href={REPO_URL} target="_blank" rel="noopener noreferrer">
          {t.states.browseRepo}
        </a>
      </div>
    </div>
  );
}

/** The catalog has no plugins yet (AC-29). */
export function EmptyCatalog() {
  return (
    <div className="empty">
      <code className="pill">{t.states.emptyPill}</code>
      <h2>{t.states.emptyTitle}</h2>
      <p>{t.states.emptyText}</p>
      <div className="actions" style={{ justifyContent: "center", marginTop: 6 }}>
        <a className="btn btn-primary btn-lg" href={href.gettingStarted()}>
          {t.states.getStarted}
        </a>
        <a className="btn btn-lg" href={CONTRIBUTING_URL} target="_blank" rel="noopener noreferrer">
          {t.states.addFirstPlugin}
        </a>
      </div>
      <p className="faint" style={{ fontSize: 13, marginTop: 6 }}>
        {t.states.emptyFootnoteBefore}
        <span className="mono">{t.states.emptyFootnoteFile}</span>
        {t.states.emptyFootnoteAfter}
      </p>
    </div>
  );
}

export function NotFound({ what, path }: { what: string; path: string }) {
  return (
    <div className="container" style={{ padding: "96px 24px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
        <code className="mono faint" style={{ fontSize: 13, padding: "4px 10px", borderRadius: 4, background: "var(--surf2)", overflowWrap: "anywhere" }}>
          #{path}
        </code>
        <h1 className="h1" style={{ fontSize: 34 }}>
          {what}
        </h1>
        <p className="muted" style={{ margin: 0, fontSize: 16 }}>
          {t.states.notFoundText}
        </p>
        <div className="actions" style={{ marginTop: 8 }}>
          <a className="btn btn-primary btn-lg" href={href.search()}>
            {t.states.searchCatalog}
          </a>
          <a className="btn btn-lg" href={href.home()}>
            {t.states.goHome}
          </a>
        </div>
      </div>
    </div>
  );
}

export function CardSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="card-grid" aria-busy="true" aria-label={t.states.loadingResults}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card" style={{ padding: 18, gap: 12, minHeight: 190 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="skel" style={{ width: 54, height: 22 }} />
            <div className="skel" style={{ width: "45%", height: 22 }} />
          </div>
          <div className="skel" style={{ width: "95%", height: 13 }} />
          <div className="skel" style={{ width: "70%", height: 13 }} />
          <div className="skel" style={{ width: "40%", height: 13 }} />
        </div>
      ))}
    </div>
  );
}
