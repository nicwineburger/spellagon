import { readFileSync } from "node:fs";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

/** The headers Cloudflare Pages sends for every path, read from `public/_headers`, so the preview server and the smoke test run under the production policy. */
function productionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  let everyPath = false;
  for (const line of readFileSync(new URL("./public/_headers", import.meta.url), "utf8").split("\n")) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      everyPath = line.trim() === "/*";
      continue;
    }
    const colon = line.indexOf(":");
    if (everyPath && colon > 0) headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return headers;
}

// Production serves from the domain root. BASE_PATH lets a build target a sub-path when needed.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [svelte()],
  preview: { headers: productionHeaders() },
  test: { include: ["src/**/*.test.ts"] },
});
