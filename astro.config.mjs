// @ts-check
// @ts-expect-error Astro executes this config in Node, whose types are intentionally absent from the app tsconfig.
import { rm } from 'node:fs/promises';

import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

/** @param {{ dir: URL }} build */
async function removeCmsPreviewRoute({ dir }) {
  await rm(new URL('blog/cms-preview/', dir), { recursive: true, force: true });
}

const excludeCmsPreviewFromBuild = {
  name: 'exclude-cms-preview-from-build',
  hooks: {
    'astro:build:done': removeCmsPreviewRoute
  }
};

const cmsPreviewMode = Reflect.get(globalThis, 'process')?.env?.CMS_PREVIEW === '1';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), excludeCmsPreviewFromBuild],

  vite: {
    plugins: [tailwindcss()],
    server: {
      hmr: cmsPreviewMode ? false : undefined
    }
  }
});
