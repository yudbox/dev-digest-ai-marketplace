import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildIndex } from "../../scripts/build-index.mjs";

export const DEMO_ROOT = path.resolve(__dirname, "fixtures/demo-marketplace");

export function demoCatalog() {
  return buildIndex({ root: DEMO_ROOT, now: new Date("2026-10-10T14:32:00Z") });
}

/** Writes a throwaway marketplace from a { relativePath: content } map. */
export function tempMarketplace(files: Record<string, string | object>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-fixture-"));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  }
  return root;
}
