import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  outputDir: '../_pruebas/cms-sitio/artifacts',
  reporter: [
    ['list'],
    ['json', { outputFile: '../_pruebas/cms-sitio/e2e.json' }],
    ['html', { outputFolder: '../_pruebas/cms-sitio/html', open: 'never' }],
  ],
  projects: [
    { name: 'cms', testMatch: 'cms.spec.ts' },
    { name: 'sitio', testMatch: 'sitio.spec.ts' },
    { name: 'integracion', testMatch: 'integracion.spec.ts' },
  ],
});
