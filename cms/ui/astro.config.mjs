import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  output: "static",
  outDir: "../ui-dist",
  publicDir: "../public",
  vite: {
    server: {
      port: 4326,
    },
  },
});
