import { useCallback, useEffect, useRef, useState } from "react";
import { Footer, TopBar } from "./components/TopBar";
import { Palette } from "./components/Palette";
import { NotFound } from "./components/States";
import { useCatalog } from "./lib/catalog";
import { useRoute } from "./lib/router";
import { useTheme } from "./lib/theme";
import { Home } from "./pages/Home";
import { SearchPage } from "./pages/Search";
import { PluginPage } from "./pages/Plugin";
import { ArtifactPage } from "./pages/Artifact";
import { WhatsNew } from "./pages/WhatsNew";
import { GettingStarted } from "./pages/GettingStarted";
import { t } from "./i18n";

const TITLES: Record<string, string> = {
  home: t.app.name,
  search: t.app.pageTitle(t.app.titles.search),
  "whats-new": t.app.pageTitle(t.app.titles.whatsNew),
  "getting-started": t.app.pageTitle(t.app.titles.gettingStarted),
};

export function App() {
  const route = useRoute();
  const catalog = useCatalog();
  const [theme, toggleTheme] = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  const openPalette = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setPaletteOpen(true);
  }, []);
  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    // Restore focus to where the user was (AC-24).
    setTimeout(() => returnFocus.current?.focus?.(), 0);
  }, []);

  // Cmd+K (macOS) / Ctrl+K (others) from any page (AC-23).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, openPalette, closePalette]);

  // New page → top of page and a fitting title. Typing in search only
  // changes the query string, which keeps the scroll position.
  const pageKey = route.name === "plugin" ? `plugin:${route.plugin}` : route.name === "artifact" ? `artifact:${route.id}` : route.name;
  useEffect(() => {
    window.scrollTo?.(0, 0);
    if (TITLES[pageKey]) document.title = TITLES[pageKey];
  }, [pageKey]);

  let page: React.ReactNode;
  switch (route.name) {
    case "home":
      page = <Home catalog={catalog} />;
      break;
    case "search":
      page = <SearchPage catalog={catalog} params={route.params} />;
      break;
    case "plugin":
      page = <PluginPage catalog={catalog} name={route.plugin} />;
      break;
    case "artifact":
      page = <ArtifactPage catalog={catalog} id={route.id} />;
      break;
    case "whats-new":
      page = <WhatsNew catalog={catalog} />;
      break;
    case "getting-started":
      page = <GettingStarted />;
      break;
    default:
      page = <NotFound what={t.app.pageNotFound} path={route.path} />;
  }

  const index = catalog.status === "ready" ? catalog.index : undefined;
  return (
    <div className="app">
      <a href="#main" className="sr-only" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>
        {t.app.skipToContent}
      </a>
      <TopBar route={route} theme={theme} onToggleTheme={toggleTheme} onOpenPalette={openPalette} />
      <main id="main" tabIndex={-1} style={{ outline: "none" }}>
        {page}
      </main>
      <Footer generatedAt={index?.generatedAt} schemaVersion={index?.schemaVersion} />
      {paletteOpen && <Palette search={catalog.status === "ready" ? catalog.search : null} onClose={closePalette} />}
    </div>
  );
}
