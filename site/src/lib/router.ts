import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "search"; params: URLSearchParams }
  | { name: "plugin"; plugin: string }
  | { name: "artifact"; id: string }
  | { name: "whats-new" }
  | { name: "getting-started" }
  | { name: "not-found"; path: string };

/** Hash routes (#/...) work on GitHub Pages without rewrite rules (AC-32). */
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "/";
  const [pathPart, query = ""] = raw.split("?");
  const path = pathPart.replace(/\/+$/, "") || "/";
  if (path === "/") return { name: "home" };
  if (path === "/search") return { name: "search", params: new URLSearchParams(query) };
  if (path === "/whats-new") return { name: "whats-new" };
  if (path === "/getting-started") return { name: "getting-started" };
  const plugin = /^\/plugin\/(.+)$/.exec(path);
  if (plugin) return { name: "plugin", plugin: safeDecode(plugin[1]) };
  const artifact = /^\/artifact\/(.+)$/.exec(path);
  if (artifact) return { name: "artifact", id: safeDecode(artifact[1]) };
  return { name: "not-found", path };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export const href = {
  home: () => "#/",
  search: (params?: Record<string, string | string[] | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      const value = Array.isArray(v) ? v.join(",") : v;
      if (value) qs.set(k, value);
    }
    const s = qs.toString();
    return s ? `#/search?${s}` : "#/search";
  },
  plugin: (name: string) => `#/plugin/${encodeURIComponent(name)}`,
  artifact: (id: string) => `#/artifact/${encodeURIComponent(id)}`,
  entry: (e: { kind: string; name: string; id: string }) =>
    e.kind === "plugin" ? href.plugin(e.name) : href.artifact(e.id),
  whatsNew: () => "#/whats-new",
  gettingStarted: () => "#/getting-started",
};

export function navigate(hash: string, { replace = false } = {}) {
  if (replace) {
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = hash;
  }
}
