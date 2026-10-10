import type { IndexEntry } from "../lib/types";
import { installCommand } from "../lib/config";
import { href } from "../lib/router";
import { t } from "../i18n";
import { CopyButton } from "./CopyButton";
import { Highlight } from "./Highlight";
import { KindBadge } from "./KindBadge";

/** Search result card (AC-10). Components copy the parent plugin's install
 * command and show how to invoke them after install (AC-14). */
export function Card({ entry, terms = [] }: { entry: IndexEntry; terms?: string[] }) {
  const isPlugin = entry.kind === "plugin";
  const plugin = isPlugin ? entry.name : entry.parentPlugin ?? "";
  const link = href.entry(entry);
  return (
    <article className="card" aria-label={t.card.aria(entry.kind, entry.displayName)}>
      <div className="card-body">
        <div className="card-head">
          <KindBadge kind={entry.kind} />
          <h3 className="card-title">
            <a href={link}>
              <Highlight text={entry.displayName} terms={terms} />
            </a>
          </h3>
          {isPlugin && entry.version && <span className="version">v{entry.version}</span>}
        </div>
        <p className="card-desc">
          {entry.description ? <Highlight text={entry.description} terms={terms} /> : <span className="faint">{t.card.noDescription}</span>}
        </p>
        {entry.keywords.length > 0 && (
          <div className="tags">
            {entry.keywords.map((k) => (
              <span key={k} className="tag">
                #{k}
              </span>
            ))}
          </div>
        )}
        {!isPlugin && entry.invocation && (
          <div className="invoke">
            <span>{t.card.invoke}</span>
            <code>{entry.invocation}</code>
          </div>
        )}
      </div>
      <div className="card-foot">
        <span className="card-owner">
          <span className="mono">{plugin}</span>
          {entry.author?.name ? ` · ${entry.author.name}` : ""}
        </span>
        <CopyButton text={entry.installCommand ?? installCommand(plugin)} />
        <a className="btn btn-sm" href={link} aria-label={t.card.openAria(entry.displayName)}>
          {t.card.open}
        </a>
      </div>
    </article>
  );
}

/** Compact card for a plugin's component list. */
export function MiniCard({ entry }: { entry: IndexEntry }) {
  return (
    <a className="mini" href={href.entry(entry)}>
      <span className="mini-head">
        <KindBadge kind={entry.kind} small />
        <span className="mini-name">{entry.displayName}</span>
      </span>
      {entry.description && <span className="mini-desc">{entry.description}</span>}
      {entry.invocation && <code>{entry.invocation}</code>}
      {entry.hookEvents && <code>{t.card.hookOn(entry.hookEvents.join(", "))}</code>}
    </a>
  );
}
