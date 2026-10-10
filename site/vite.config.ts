/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base: "./"` makes every asset URL relative, so the same build works at
// https://<owner>.github.io/<repo>/ (a project page), at a custom domain and
// under `vite preview`. Routing is hash-based (#/...), so GitHub Pages never
// needs rewrite rules.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
