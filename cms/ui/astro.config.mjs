import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readCmsEnv(key) {
  if (process.env[key]) return process.env[key];

  const envFile = resolve(process.cwd(), "..", ".env");
  if (!existsSync(envFile)) return undefined;

  const line = readFileSync(envFile, "utf-8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  return line?.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, "");
}

function normalizeBasePath(value) {
  const trimmed = (value || "").trim();
  if (!trimmed || trimmed === "/") return "/";

  try {
    const parsed = new URL(trimmed);
    return normalizeBasePath(parsed.pathname);
  } catch {
    const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
    return withoutTrailingSlash.startsWith("/") ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
  }
}

const base = normalizeBasePath(readCmsEnv("CMS_BASE_PATH"));

export default defineConfig({
  integrations: [react()],
  output: "static",
  base,
  build: {
    assets: "cms-assets",
  },
  outDir: "../ui-dist",
  publicDir: "../public",
  vite: {
    server: {
      port: 4326,
    },
  },
});
