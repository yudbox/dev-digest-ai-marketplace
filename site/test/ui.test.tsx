import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "../src/App";
import { Card } from "../src/components/Card";
import type { CatalogIndex, Release } from "../src/lib/types";
import { demoCatalog } from "./helpers";

function mockFetch(index: CatalogIndex, releases: Release[] = [], bodies = new Map<string, string>()) {
  const calls: string[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    if (url.endsWith("index.json")) return json(index);
    if (url.endsWith("releases.json")) return json(releases);
    for (const [p, md] of bodies) if (url.endsWith(p)) return new Response(md, { status: 200 });
    return new Response("not found", { status: 404, statusText: "Not Found" });
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

beforeEach(() => {
  vi.stubGlobal("scrollTo", () => {});
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.location.hash = "";
});

describe("card and copy", () => {
  const { index } = demoCatalog();
  const retro = index.items.find((i) => i.id === "skill:sdd-engineering/retro")!;
  const plugin = index.items.find((i) => i.id === "plugin:research-tools")!;

  it("AC-10/13: plugin card copies its install command and shows Copied ✓ for 2 s", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Card entry={plugin} />);
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("#research")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Copy install/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Copied/ })).toHaveTextContent("Copied ✓"));
    expect(writeText).toHaveBeenCalledWith("/plugin install research-tools@dev-digest-ai-marketplace");
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.getByRole("button", { name: /Copy install/ })).toHaveTextContent("Copy install");
  });

  it("AC-14: a skill card copies the parent plugin install and shows the invocation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<Card entry={retro} />);
    expect(screen.getByText("/sdd-engineering:retro")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Copy install/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("/plugin install sdd-engineering@dev-digest-ai-marketplace"));
  });

  it("AC-15: without the Clipboard API the command is shown pre-selected", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    render(<Card entry={plugin} />);
    fireEvent.click(screen.getByRole("button", { name: /Copy install/ }));
    const field = await screen.findByDisplayValue("/plugin install research-tools@dev-digest-ai-marketplace");
    expect(document.activeElement).toBe(field);
  });
});

describe("pages", () => {
  it("AC-29: empty catalog shows the empty state with both calls to action", async () => {
    const empty: CatalogIndex = { ...demoCatalog().index, items: [], stats: { plugin: 0, skill: 0, agent: 0, command: 0, hook: 0, mcp: 0 } };
    mockFetch(empty);
    renderAt("#/");
    expect(await screen.findByText(/The catalog is empty/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "#/getting-started");
    expect(screen.getByRole("link", { name: "Add the first plugin" }).getAttribute("href")).toMatch(/CONTRIBUTING\.md$/);
  });

  it("AC-26/27/28: home shows stats that open browse, and the 5 latest releases", async () => {
    const { index, releases } = demoCatalog();
    const many = [...releases, ...releases.map((r) => ({ ...r, version: "0.9.0", date: "2026-09-01" }))];
    mockFetch(index, many);
    renderAt("#/");
    const agents = await screen.findByRole("link", { name: "Browse 6 agents" });
    expect(agents).toHaveAttribute("href", "#/search?kind=agent");
    const list = screen.getByRole("heading", { name: "What's new" }).closest("section")!;
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
  });

  it("AC-11/12: search updates the hash and shows a no-results message", async () => {
    const { index } = demoCatalog();
    mockFetch(index);
    renderAt("#/search?kind=agent");
    expect(await screen.findByText(/Browsing 6 entries/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search the catalog"), { target: { value: "kubernetes operator" } });
    await waitFor(() => expect(window.location.hash).toBe("#/search?q=kubernetes+operator&kind=agent"));
    expect(await screen.findByText("Nothing found — try a simpler query")).toBeInTheDocument();
    expect(screen.queryByText(/The catalog is empty/)).toBeNull();
  });

  it("AC-16/18: plugin page lazy-loads its README only", async () => {
    const { index, releases, bodies } = demoCatalog();
    const calls = mockFetch(index, releases, bodies);
    renderAt("#/plugin/sdd-engineering");
    expect(await screen.findByRole("heading", { level: 1, name: "SDD Engineering" })).toBeInTheDocument();
    expect(screen.getByText("Spec Creator")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View on GitHub/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /research-tools/ })).toHaveAttribute("href", "#/plugin/research-tools");
    await screen.findByRole("heading", { level: 2, name: "Workflow" });
    const bodyCalls = calls.filter((c) => c.includes("bodies/"));
    expect(bodyCalls).toEqual([expect.stringContaining("bodies/plugin/sdd-engineering.md")]);
  });

  it("AC-17: artifact page shows tools, model and invocation", async () => {
    const { index, releases, bodies } = demoCatalog();
    mockFetch(index, releases, bodies);
    renderAt("#/artifact/agent%3Asdd-engineering%2Fspec-creator");
    expect(await screen.findByRole("heading", { level: 1, name: "Spec Creator" })).toBeInTheDocument();
    expect(screen.getByText("Grep")).toBeInTheDocument();
    expect(screen.getByText("opus")).toBeInTheDocument();
    expect(screen.getByText("sdd-engineering:spec-creator")).toBeInTheDocument();
  });

  it("AC-19: unknown plugin shows not found with a link to search", async () => {
    mockFetch(demoCatalog().index);
    renderAt("#/plugin/does-not-exist");
    expect(await screen.findByText(/No plugin called “does-not-exist”/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Search the catalog" })).toHaveAttribute("href", "#/search");
  });

  it("AC-30/31: getting started has copy buttons for every command", async () => {
    mockFetch(demoCatalog().index);
    renderAt("#/getting-started");
    for (const cmd of [
      "/plugin marketplace add yudbox/dev-digest-ai-marketplace",
      "/plugin install <name>@dev-digest-ai-marketplace",
      "/reload-plugins",
      "/plugin marketplace update",
      "claude plugin marketplace update",
      "/plugin update",
      "claude plugin update",
    ]) {
      expect(screen.getByRole("button", { name: `Copy: ${cmd}` })).toBeInTheDocument();
    }
    expect(screen.getByText(/extraKnownMarketplaces/)).toBeInTheDocument();
  });

  it("AC-33: a different schemaVersion reloads the page once", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload, hash: "#/", pathname: "/", search: "" });
    mockFetch({ ...demoCatalog().index, schemaVersion: 999 });
    render(<App />);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });
});

describe("command palette", () => {
  it("AC-23/24: Cmd+K opens with focus, arrows + Enter open a result, Escape closes", async () => {
    const { index } = demoCatalog();
    mockFetch(index);
    renderAt("#/");
    await screen.findByRole("link", { name: "Browse 6 agents" });
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByRole("combobox");
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "spec" } });
    const options = within(dialog).getAllByRole("option");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    const second = options[1].getAttribute("href");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(window.location.hash).toBe(second));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
