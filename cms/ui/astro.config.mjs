import { defineConfig } from "astro/config";
import react from "@astrojs/react";

const base = process.env.CMS_BASE_PATH || "/";

export default defineConfig({
  integrations: [react()],
  output: "static",
  base,
  outDir: "../ui-dist",
  publicDir: "../public",
  vite: {
    server: {
      port: 4326,
    },
  },
});
