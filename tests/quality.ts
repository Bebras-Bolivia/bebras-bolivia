import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createSandbox } from './helpers/sandbox.ts';

// The plan proposes 90 for accessibility. Other categories are measured,
// without inventing acceptance limits that have not been agreed with the user.
const minimumAccessibility = Number(process.env.QUALITY_MIN_ACCESSIBILITY ?? 90);
const routes = [
  '/',
  '/estudiantes',
  '/maestros',
  '/faq',
  '/contacto',
  '/sponsors',
  '/blog',
  '/certificado',
];
const output = resolve(import.meta.dirname, '../../_pruebas/cms-sitio/calidad.json');
const report = {
  generatedAt: new Date().toISOString(),
  environment: 'Sitio compilado en sandbox temporal; Chromium móvil de Playwright',
  minimumAccessibility,
  lighthouse: [] as Array<Record<string, unknown>>,
  pageWeight: [] as Array<Record<string, unknown>>,
  load: {} as Record<string, unknown>,
  errors: [] as string[],
};

let sandbox: Awaited<ReturnType<typeof createSandbox>> | undefined;
try {
  sandbox = await createSandbox({ buildSite: true });
  const siteUrl = sandbox.siteUrl;
  const browser = await chromium.launch();
  try {
    for (const route of routes) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
      });
      const resources: Array<{ url: string; type: string; bytes: number; external: boolean }> = [];
      const pending: Promise<void>[] = [];
      const failed: string[] = [];
      page.on('requestfailed', (request) =>
        failed.push(`${request.url()}: ${request.failure()?.errorText}`)
      );
      page.on('response', (response) => {
        pending.push(
          (async () => {
            try {
              const body = await response.body();
              resources.push({
                url: response.url(),
                type: response.request().resourceType(),
                bytes: body.byteLength,
                external: !response.url().startsWith(siteUrl),
              });
            } catch {
              /* redirects and interrupted resources have no body */
            }
          })()
        );
      });
      try {
        await page.goto(`${siteUrl}${route}`, { waitUntil: 'networkidle', timeout: 45000 });
        await Promise.all(pending);
        const bytesOf = (types: string[]) =>
          resources
            .filter((resource) => types.includes(resource.type))
            .reduce((sum, resource) => sum + resource.bytes, 0);
        report.pageWeight.push({
          route,
          totalDecodedBytes: bytesOf([...new Set(resources.map((resource) => resource.type))]),
          htmlBytes: bytesOf(['document']),
          javascriptBytes: bytesOf(['script']),
          imageBytes: bytesOf(['image']),
          cssBytes: bytesOf(['stylesheet']),
          failedRequests: failed,
          resources,
        });
      } catch (error) {
        report.errors.push(`Peso ${route}: ${String(error)}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    for (const route of routes) {
      console.log(`Lighthouse móvil: ${route}`);
      try {
        const result = await lighthouse(`${siteUrl}${route}`, {
          port: chrome.port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        });
        if (!result) throw new Error('Lighthouse no devolvió un resultado');
        const scores = Object.fromEntries(
          Object.entries(result.lhr.categories).map(([name, category]) => [
            name,
            Math.round((category.score ?? 0) * 100),
          ])
        );
        const failures = Object.values(result.lhr.audits)
          .filter(
            (audit) =>
              audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== 'informative'
          )
          .map((audit) => ({
            id: audit.id,
            title: audit.title,
            score: audit.score,
            description: audit.description,
            details: audit.details,
          }));
        report.lighthouse.push({
          route,
          scores,
          failures,
          lighthouseVersion: result.lhr.lighthouseVersion,
          runtimeError: result.lhr.runtimeError,
          warnings: result.lhr.runWarnings,
        });
        if (result.lhr.runtimeError)
          report.errors.push(`Lighthouse ${route}: ${result.lhr.runtimeError.message}`);
      } catch (error) {
        report.errors.push(`Lighthouse ${route}: ${String(error)}`);
      }
    }
  } finally {
    await chrome.kill();
  }

  const start = performance.now();
  const durations: number[] = [];
  const requests = await Promise.all(
    Array.from({ length: 100 }, async () => {
      const before = performance.now();
      try {
        const response = await fetch(`${siteUrl}/certificado`, {
          signal: AbortSignal.timeout(15000),
        });
        const body = await response.text();
        durations.push(performance.now() - before);
        return response.status === 200 && body.includes('certificate-code');
      } catch {
        durations.push(performance.now() - before);
        return false;
      }
    })
  );
  durations.sort((a, b) => a - b);
  report.load = {
    route: '/certificado',
    concurrentRequests: 100,
    successful: requests.filter(Boolean).length,
    failed: requests.filter((value) => !value).length,
    totalMs: performance.now() - start,
    medianMs: durations[49],
    p95Ms: durations[94],
    maxMs: durations[99],
    scope: 'HTTP estático local; no mide capacidad de Apache ni descifrado en navegador',
  };
  if (requests.some((value) => !value))
    report.errors.push('Carga: alguna consulta concurrente falló');
} catch (error) {
  report.errors.push(String(error));
} finally {
  await sandbox?.close();
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2));
}

const belowMinimum = report.lighthouse.some(
  (entry) => (entry.scores as Record<string, number>).accessibility < minimumAccessibility
);
console.log(`Informe de calidad: ${output}`);
console.log(
  JSON.stringify(
    {
      lighthouse: report.lighthouse.map(({ route, scores }) => ({ route, scores })),
      load: report.load,
      errors: report.errors,
    },
    null,
    2
  )
);
if (report.errors.length || belowMinimum || report.lighthouse.length !== routes.length)
  process.exitCode = 1;
