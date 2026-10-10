import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogSearch } from "../lib/search";
import type { IndexEntry } from "../lib/types";
import { href, navigate } from "../lib/router";
import { Highlight } from "./Highlight";
import { KindBadge } from "./KindBadge";
import { SearchIcon } from "./Icons";
import { shortcutLabel } from "./TopBar";
import { t } from "../i18n";

const RECENT_KEY = "catalog-recent";
const MAX_RESULTS = 8;

export function rememberRecent(id: string) {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...list.filter((x) => x !== id)].slice(0, 5)));
  } catch {
    /* storage unavailable */
  }
}

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

type Row =
  | { type: "entry"; entry: IndexEntry; target: string }
  | { type: "page"; label: string; meta: string; target: string };

const PAGES: Row[] = [
  { type: "page", label: t.palette.pages.gettingStarted, meta: "#/getting-started", target: href.gettingStarted() },
  { type: "page", label: t.palette.pages.whatsNew, meta: "#/whats-new", target: href.whatsNew() },
  { type: "page", label: t.palette.pages.browseAgents, meta: "#/search?kind=agent", target: href.search({ kind: "agent" }) },
  { type: "page", label: t.palette.pages.browseSkills, meta: "#/search?kind=skill", target: href.search({ kind: "skill" }) },
];

/** Cmd/Ctrl+K palette (AC-23, AC-24). */
export function Palette({ search, onClose }: { search: CatalogSearch | null; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { sections, rows, terms } = useMemo(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      const recent = readRecent()
        .map((id) => search?.get(id))
        .filter((e): e is IndexEntry => !!e)
        .slice(0, 3)
        .map<Row>((entry) => ({ type: "entry", entry, target: href.entry(entry) }));
      const secs = [
        ...(recent.length ? [{ title: t.palette.recent, rows: recent }] : []),
        { title: t.palette.goTo, rows: PAGES },
      ];
      return { sections: secs, rows: secs.flatMap((s) => s.rows), terms: [] as string[] };
    }
    const found = search ? search.search(trimmed, { kind: [], keyword: [], author: [], plugin: [] }) : null;
    const hits = (found?.results ?? []).slice(0, MAX_RESULTS).map<Row>((entry) => ({ type: "entry", entry, target: href.entry(entry) }));
    const secs = hits.length ? [{ title: t.palette.results(hits.length), rows: hits }] : [];
    return { sections: secs, rows: hits, terms: found?.terms ?? [] };
  }, [q, search]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`#pal-opt-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  const open = (row: Row | undefined) => {
    if (!row) return;
    if (row.type === "entry") rememberRecent(row.entry.id);
    onClose();
    navigate(row.target);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(rows.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      open(rows[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      // Keep focus inside the dialog: the input is its only focus stop.
      e.preventDefault();
    }
  };

  let index = -1;
  return (
    <div className="palette-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={t.palette.dialogAria} onKeyDown={onKeyDown}>
        <div className="palette-input">
          <SearchIcon size={20} />
          <label htmlFor="palette-q" className="sr-only">
            {t.palette.inputLabel}
          </label>
          <input
            id="palette-q"
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.palette.placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls="pal-list"
            aria-activedescendant={rows.length ? `pal-opt-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>{t.palette.esc}</kbd>
        </div>
        <div id="pal-list" ref={listRef} className="palette-list" role="listbox" aria-label={t.palette.listAria}>
          {sections.map((sec) => (
            <div key={sec.title} role="group" aria-label={sec.title}>
              <div className="palette-section" role="presentation">
                {sec.title}
              </div>
              {sec.rows.map((row) => {
                index += 1;
                const i = index;
                return (
                  <a
                    key={row.target}
                    id={`pal-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className="palette-row"
                    href={row.target}
                    tabIndex={-1}
                    onMouseMove={() => setActive(i)}
                    onClick={(e) => {
                      e.preventDefault();
                      open(row);
                    }}
                  >
                    {row.type === "entry" ? (
                      <>
                        <span className="kind-slot">
                          <KindBadge kind={row.entry.kind} />
                        </span>
                        <span className="name">
                          <Highlight text={row.entry.displayName} terms={terms} />
                        </span>
                        <span className="meta">
                          {row.entry.kind === "plugin" ? (row.entry.version ? `v${row.entry.version}` : "") : row.entry.parentPlugin}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="kind-slot" aria-hidden="true">
                          {t.palette.pageMarker}
                        </span>
                        <span className="name">{row.label}</span>
                        <span className="meta">{row.meta}</span>
                      </>
                    )}
                    <span className="enter" aria-hidden="true">
                      ↵
                    </span>
                  </a>
                );
              })}
            </div>
          ))}
          {q.trim() && rows.length === 0 && (
            <div className="palette-empty">
              <p style={{ fontSize: 16, fontWeight: 600 }}>{t.palette.noResultsTitle(q.trim())}</p>
              <p className="muted" style={{ fontSize: 14, maxWidth: "44ch" }}>
                {t.palette.noResultsText}
              </p>
              <a
                href={href.search({ q: q.trim() })}
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  navigate(href.search({ q: q.trim() }));
                }}
              >
                {t.palette.openFullSearch}
              </a>
            </div>
          )}
        </div>
        <div className="palette-foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> {t.palette.navigate}
          </span>
          <span>
            <kbd>{t.palette.enter}</kbd> {t.palette.open}
          </span>
          <span>
            <kbd>{t.palette.escKey}</kbd> {t.palette.close}
          </span>
          <span className="right">{t.palette.anywhere(shortcutLabel)}</span>
        </div>
      </div>
    </div>
  );
}
