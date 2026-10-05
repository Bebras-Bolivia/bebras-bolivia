import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createSandbox } from '../helpers/sandbox';
import { deriveCertificateSecrets, encryptCertificate } from '../../cms/src/certificates/crypto';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

let sandbox: Awaited<ReturnType<typeof createSandbox>>;
const codes: Record<string, string> = {};
const routes = [
  '/',
  '/estudiantes/',
  '/maestros/',
  '/faq/',
  '/contacto/',
  '/sponsors/',
  '/registro/',
  '/blog/',
  '/certificado/',
  '/pagina-de-prueba/',
  '/blog/noticia-e2e/',
];
test.describe.configure({ mode: 'default' });
test.beforeAll(async () => {
  test.setTimeout(240_000);
  sandbox = await createSandbox();
  const registro = await (await sandbox.request('/api/content/registro.json')).json();
  registro.registration.openHref = '';
  registro.heading = 'Desafío en espera';
  registro.disabledButton = 'Inscripciones en espera';
  expect((await sandbox.request('/api/content/registro.json', 'PUT', registro)).ok).toBe(true);
  expect(
    (
      await sandbox.request('/api/content/custom-pages/create', 'POST', {
        title: 'Página de prueba',
      })
    ).ok
  ).toBe(true);
  expect(
    (await sandbox.request('/api/content/custom-pages/create', 'POST', { title: 'Página oculta' }))
      .ok
  ).toBe(true);
  expect(
    (
      await sandbox.request('/api/content/custom-pages/pagina-oculta/status', 'PUT', {
        active: false,
      })
    ).ok
  ).toBe(true);
  expect(
    (
      await sandbox.request('/api/blog', 'POST', {
        slug: 'noticia-e2e',
        frontmatter: {
          title: 'Noticia E2E',
          description: 'Descripción ñandú y educación',
          date: '2026-09-29',
          author: 'Pruebas',
        },
        body: '## Pensamiento computacional\n\nTexto con **énfasis**.\n\n<script>window.__injected=true</script>\n\n[Inseguro](javascript:alert(1))',
      })
    ).ok
  ).toBe(true);
  for (const distinction of ['participation', 'merit', '1']) {
    const response = await sandbox.request('/api/certificates/manual', 'POST', {
      name: `Persona ${distinction}`,
      department: 'cochabamba',
      contest: 'Desafío de prueba',
      year: 2026,
      distinction,
      category: 'Kuntur',
      issuedAt: '2026-09-29',
    });
    expect(response.ok).toBe(true);
    codes[distinction] = (await response.json()).code;
  }
  expect((await sandbox.request('/api/preview/sync', 'POST')).ok).toBe(true);
  await sandbox.build();
  codes.legacy = 'LEGACY23';
  const { fileId, secret } = await deriveCertificateSecrets(codes.legacy);
  await writeFile(
    join(sandbox.landing, 'dist/certificados', `${fileId}.json`),
    JSON.stringify(
      await encryptCertificate(secret, [
        {
          contest: 'Desafío antiguo',
          year: 2025,
          issuedAt: null,
          participants: ['Persona antigua'],
          category: '',
          grade: null,
          school: null,
          place: null,
          department: null,
          score: 0,
          correct: 0,
          questions: 0,
          rank: null,
          rankOf: null,
        },
      ])
    )
  );
});
test.afterAll(async () => {
  await sandbox?.close();
});

for (const route of routes) {
  test(`Sitio carga ${route} sin errores de JavaScript`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    const response = await page.goto(`${sandbox.siteUrl}${route}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
}
test('Sitio recorre todos los enlaces internos', async ({ page, request }) => {
  const links = new Set<string>();
  for (const route of routes) {
    await page.goto(`${sandbox.siteUrl}${route}`);
    for (const href of await page
      .locator('a[href]')
      .evaluateAll((elements) => elements.map((e) => (e as HTMLAnchorElement).href))) {
      const url = new URL(href);
      if (url.origin === new URL(sandbox.siteUrl).origin) {
        url.hash = '';
        links.add(url.href);
      }
    }
  }
  for (const href of links) expect((await request.get(href)).status(), href).toBeLessThan(400);
});
test('Sitio menú de escritorio navega a estudiantes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(sandbox.siteUrl);
  await page.getByRole('link', { name: 'Estudiantes', exact: true }).first().click();
  await expect(page).toHaveURL(/\/estudiantes\/?$/);
});
test('Sitio menú móvil abre, navega y cierra', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(sandbox.siteUrl);
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page
    .getByRole('navigation', { name: 'Navegacion movil' })
    .getByRole('link', { name: 'Maestros', exact: true })
    .click();
  await expect(page).toHaveURL(/\/maestros\/?$/);
  await expect(page.getByRole('navigation', { name: 'Navegacion movil' })).not.toBeVisible();
});
test('Sitio blog muestra UTF-8 y Markdown sin ejecución de HTML', async ({ page }) => {
  await page.goto(`${sandbox.siteUrl}/blog/noticia-e2e/`);
  await expect(page.getByRole('heading', { name: 'Noticia E2E', exact: true })).toBeVisible();
  await expect(page.locator('strong').filter({ hasText: 'énfasis' })).toBeVisible();
  expect(await page.evaluate(() => '__injected' in window)).toBe(false);
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
});
test('Sitio página personalizada activa y oculta', async ({ page, request }) => {
  await page.goto(`${sandbox.siteUrl}/pagina-de-prueba/`);
  await expect(page.getByRole('heading', { name: 'Página de prueba', exact: true })).toBeVisible();
  expect((await request.get(`${sandbox.siteUrl}/pagina-oculta/`)).status()).toBe(404);
  await expect(page.getByRole('link', { name: 'Página oculta', exact: true })).toHaveCount(0);
});
test('Sitio registro cerrado tiene botón deshabilitado', async ({ page }) => {
  await page.goto(`${sandbox.siteUrl}/registro/`);
  await expect(page.getByRole('heading', { name: 'Desafío en espera', exact: true })).toBeVisible();
  await expect(page.getByText('Inscripciones en espera', { exact: true })).toHaveAttribute(
    'aria-disabled',
    'true'
  );
});
for (const [distinction, label] of [
  ['participation', 'de participación'],
  ['merit', 'de mérito'],
  ['1', 'de excelencia'],
]) {
  test(`Sitio certificado ${label} abre directamente con código`, async ({ page }) => {
    await page.goto(`${sandbox.siteUrl}/certificado/?codigo=${codes[distinction]}`);
    await expect(page.locator('.certificate-sheet')).toContainText(`Persona ${distinction}`);
    await expect(page.locator('.certificate-sheet')).toContainText(label);
    await expect(
      page.getByRole('img', { name: 'Código QR para verificar el certificado' })
    ).toBeVisible();
  });
}
test('Sitio código inválido avisa sin exponer personas', async ({ page }) => {
  await page.goto(`${sandbox.siteUrl}/certificado/`);
  await page.getByLabel('Tu código personal').fill('INVALIDO');
  await page.getByRole('button', { name: 'Ver mi certificado' }).click();
  await expect(page.getByRole('alert')).toContainText('No encontramos un certificado');
  await expect(page.locator('.certificate-sheet')).toHaveCount(0);
  await expect(page.getByText('Persona participation', { exact: true })).toHaveCount(0);
});
test('Sitio certificado antiguo sin departamento conserva el castor genérico', async ({ page }) => {
  await page.goto(`${sandbox.siteUrl}/certificado/?codigo=${codes.legacy}`);
  const sheet = page.locator('.certificate-sheet');
  await expect(sheet).toContainText('Persona antigua');
  await expect(sheet.locator('img[src="/images/castores/estandar.webp"]')).toBeVisible();
  await expect(sheet).not.toContainText('null');
  await expect(sheet).not.toContainText(' · ');
});

test('Sitio certificado se almacena cifrado sin nombre ni código', async ({ request }) => {
  const { fileId } = await deriveCertificateSecrets(codes.participation);
  const response = await request.get(`${sandbox.siteUrl}/certificados/${fileId}.json`);
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(text).not.toContain('Persona participation');
  expect(text).not.toContain(codes.participation);
  expect(JSON.parse(text)).toMatchObject({
    v: 1,
    iv: expect.any(String),
    data: expect.any(String),
  });
});
test('Sitio QR decodificado apunta al certificado y su código', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 3,
  });
  try {
    const page = await context.newPage();
    await page.goto(`${sandbox.siteUrl}/certificado/?codigo=${codes.participation}`, {
      waitUntil: 'domcontentloaded',
    });
    const qr = page.getByRole('img', { name: 'Código QR para verificar el certificado' });
    await expect(qr.locator('svg')).toBeVisible();
    const png = PNG.sync.read(await qr.screenshot());
    const margin = 40;
    const width = png.width + margin * 2;
    const height = png.height + margin * 2;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 0; y < png.height; y++)
      for (let x = 0; x < png.width; x++) {
        const source = (y * png.width + x) * 4;
        const target = ((y + margin) * width + x + margin) * 4;
        pixels.set(png.data.subarray(source, source + 4), target);
      }
    const result = jsQR(pixels, width, height);
    expect(result?.data).toBe(`${sandbox.siteUrl}/certificado?codigo=${codes.participation}`);
  } finally {
    await context.close();
  }
});
test('Sitio descargar certificado genera PDF', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(`${sandbox.siteUrl}/certificado/?codigo=${codes.participation}`);
  await expect(page.locator('.certificate-sheet')).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const path = await download.path();
  expect((await readFile(path!)).subarray(0, 5).toString()).toBe('%PDF-');
});
test('Sitio impresión del certificado produce una sola página A4', async ({ page }) => {
  await page.goto(`${sandbox.siteUrl}/certificado/?codigo=${codes.participation}`);
  await expect(page.locator('.certificate-sheet')).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ preferCSSPageSize: true });
  const { PDFDocument } = await import('pdf-lib');
  const document = await PDFDocument.load(pdf);
  expect(document.getPageCount()).toBe(1);
  const size = document.getPage(0).getSize();
  expect(size.width).toBeCloseTo(841.89, 0);
  expect(size.height).toBeCloseTo(595.28, 0);
});
for (const width of [320, 390, 1280]) {
  test(`Sitio sin desbordes a ${width}px en todas las páginas`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(`${sandbox.siteUrl}${route}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        route
      ).toBe(true);
    }
  });
}
test('Sitio registro abierto redirige y todos los CTA usan destino directo', async ({ page }) => {
  test.setTimeout(240_000);
  const registro = await (await sandbox.request('/api/content/registro.json')).json();
  registro.registration.openHref = 'https://registro.example.test/desafio';
  expect((await sandbox.request('/api/content/registro.json', 'PUT', registro)).ok).toBe(true);
  await sandbox.build();
  await page.route('https://registro.example.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Formulario de prueba</h1>' })
  );
  await page.goto(`${sandbox.siteUrl}/registro/`);
  await expect(page).toHaveURL('https://registro.example.test/desafio');
  await page.goto(sandbox.siteUrl);
  await expect(page.locator('a[href="/registro"],a[href="/registro/"]')).toHaveCount(0);
  await expect(
    page.locator('a[href="https://registro.example.test/desafio"]').first()
  ).toBeVisible();
});
