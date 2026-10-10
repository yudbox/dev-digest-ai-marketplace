import { useEffect, useState } from "react";
import { loadBody } from "../lib/data";
import { renderMarkdown } from "../lib/markdown";
import type { IndexEntry } from "../lib/types";
import { t } from "../i18n";

type State = { status: "loading" } | { status: "ready"; html: string } | { status: "error"; message: string };

/** Lazily loads and renders an entry's markdown body (AC-18, AC-34). */
export function MarkdownBody({ entry }: { entry: IndexEntry }) {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    const p = loadBody(entry);
    if (!p) {
      setState({ status: "error", message: t.markdown.noDocument });
      return;
    }
    p.then(
      (text) => alive && setState({ status: "ready", html: renderMarkdown(text) }),
      (err: Error) => alive && setState({ status: "error", message: err.message })
    );
    return () => {
      alive = false;
    };
  }, [entry]);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label={t.markdown.loadingAria} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="skel" style={{ width: "40%", height: 26, marginBottom: 8 }} />
        {[92, 86, 60].map((w) => (
          <div key={w} className="skel" style={{ width: `${w}%`, height: 14 }} />
        ))}
        <div className="skel" style={{ width: "24%", height: 20, marginTop: 16 }} />
        {[80, 74, 68].map((w) => (
          <div key={w} className="skel" style={{ width: `${w}%`, height: 14 }} />
        ))}
        <p className="mono faint" style={{ margin: "8px 0 0", fontSize: 12 }}>
          {t.markdown.loading(entry.bodyPath ?? "")}
        </p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <p className="muted" style={{ margin: 0 }}>
        {t.markdown.failed(state.message)}{" "}
        <a href={entry.githubUrl} target="_blank" rel="noopener noreferrer">
          {t.markdown.readOnGitHub}
        </a>
        .
      </p>
    );
  }
  // Sanitized by renderMarkdown (markdown-it with html off + DOMPurify).
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: state.html }} />;
}
