import type { Route } from "../lib/router";
import { href } from "../lib/router";
import { REPO_URL } from "../lib/config";
import { t } from "../i18n";
import { BookIcon, MoonIcon, SearchIcon, SunIcon } from "./Icons";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const shortcutLabel = isMac ? "⌘K" : "Ctrl+K";

export function TopBar({
  route,
  theme,
  onToggleTheme,
  onOpenPalette,
}: {
  route: Route;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenPalette: () => void;
}) {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <a className="logo" href={href.home()} aria-label={t.topBar.homeAria}>
          <span className="logo-mark" aria-hidden="true">
            {t.topBar.logoMark}
          </span>
          <span className="logo-text">
            {t.topBar.logoMain}
            <span>{t.topBar.logoSub}</span>
          </span>
        </a>
        <button type="button" className="search-trigger" onClick={onOpenPalette} aria-label={t.topBar.searchAria(shortcutLabel)}>
          <SearchIcon />
          <span>{t.topBar.searchPlaceholder}</span>
          <kbd>{shortcutLabel}</kbd>
        </button>
        <nav className="nav" aria-label={t.topBar.navAria}>
          <a className="nav-link" href={href.gettingStarted()} aria-current={route.name === "getting-started" ? "page" : undefined}>
            {t.topBar.gettingStarted}
          </a>
          <a className="nav-link" href={href.whatsNew()} aria-current={route.name === "whats-new" ? "page" : undefined}>
            {t.topBar.whatsNew}
          </a>
          <button type="button" className="icon-btn" onClick={onToggleTheme} aria-label={theme === "dark" ? t.topBar.toLight : t.topBar.toDark}>
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <a className="icon-btn" href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label={t.topBar.repoAria}>
            <BookIcon />
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Footer({ generatedAt, schemaVersion }: { generatedAt?: string; schemaVersion?: number }) {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          {REPO_URL.replace("https://", "")}
        </a>
        {generatedAt && (
          <span>
            {t.footer.generated(formatUtc(generatedAt))}
            {schemaVersion ? t.footer.schema(schemaVersion) : ""}
          </span>
        )}
      </div>
    </footer>
  );
}

function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
