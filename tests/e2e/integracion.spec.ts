import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createSandbox } from '../helpers/sandbox';

let sandbox: Awaited<ReturnType<typeof createSandbox>>;
const exec = promisify(execFile);

async function json(path: string, method = 'GET', body?: unknown) {
  const response = await sandbox.request(path, method, body);
  expect(response.ok, `${method} ${path}: ${await response.clone().text()}`).toBeTruthy();
  return response.json();
}

async function compile() {
  const result = await json('/api/publish', 'POST');
  expect(result.publish.status).toBe('success');
}

test.describe('CMS → sitio compilado', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    sandbox = await createSandbox();
  });
  test.afterAll(async () => {
    await sandbox?.close();
  });

  test('INT-01 publicar un texto hace commit aislado y lo muestra en el inicio', async ({
    page,
  }) => {
    const home = await json('/api/content/home.json');
    home.hero.title = 'Texto publicado por integración';
    await json('/api/content/home.json', 'PUT', home);
    const result = await json('/api/publish', 'POST');
    expect(result.publish.status).toBe('success');
    const changes = await json('/api/publish/changes');
    expect(
      changes.items.filter((item: { file: string }) => item.file === 'home.json')
    ).toHaveLength(0);
    const { stdout } = await exec('git', ['log', '-1', '--format=%s'], { cwd: sandbox.landing });
    expect(stdout).toContain('content: publish CMS changes');
    const remotes = await exec('git', ['remote', '-v'], { cwd: sandbox.landing });
    expect(remotes.stdout).not.toContain('github.com');
    await page.goto(sandbox.siteUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: home.hero.title })).toBeVisible();
  });

  test('INT-02 una entrada del CMS aparece en lista y página del blog', async ({ page }) => {
    await json('/api/blog', 'POST', {
      slug: 'integracion-blog',
      frontmatter: {
        title: 'Entrada de integración',
        description: 'Contenido inventado para pruebas',
        date: '2026-09-29',
        author: 'Equipo ficticio',
      },
      body: 'Contenido del blog sincronizado desde el CMS.',
    });
    await compile();
    await page.goto(`${sandbox.siteUrl}/blog`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: /Entrada de integración/ }).first()).toBeVisible();
    await page.goto(`${sandbox.siteUrl}/blog/integracion-blog`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Entrada de integración' })).toBeVisible();
    await expect(page.getByText('Contenido del blog sincronizado desde el CMS.')).toBeVisible();
  });

  test('INT-03 una página personalizada oculta no llega al sitio ni al menú', async ({ page }) => {
    const created = await json('/api/content/custom-pages/create', 'POST', {
      title: 'Página privada integración',
    });
    await json(`/api/content/custom-pages/${created.page.id}/status`, 'PUT', { active: false });
    await compile();
    const response = await page.goto(`${sandbox.siteUrl}/${created.page.slug}`, {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(404);
    await page.goto(sandbox.siteUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: created.page.title })).toHaveCount(0);
  });

  test('INT-04 un certificado inventado del CMS se consulta con su código', async ({ page }) => {
    const created = await json('/api/certificates/manual', 'POST', {
      name: 'Persona Ficticia Integración',
      contest: 'Desafío ficticio integración',
      year: 2026,
      category: 'Kuntur',
      distinction: 'participation',
      issuedAt: '2026-09-29',
    });
    await compile();
    await page.goto(`${sandbox.siteUrl}/certificado?codigo=${created.code}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByText('Persona Ficticia Integración', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Descargar PDF/ })).toBeVisible();
  });

  test('INT-05 restaurar y publicar un respaldo devuelve el sitio a ese estado', async ({
    page,
  }) => {
    const home = await json('/api/content/home.json');
    const snapshot = await json('/api/snapshots', 'POST', {
      description: 'Estado integrado original',
    });
    await json('/api/content/home.json', 'PUT', {
      ...home,
      hero: { ...home.hero, title: 'Cambio descartado por restauración' },
    });
    await compile();
    await page.goto(sandbox.siteUrl, { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: 'Cambio descartado por restauración' })
    ).toBeVisible();
    await json(`/api/snapshots/${snapshot.id}/restore`, 'POST');
    const result = await json('/api/publish', 'POST');
    expect(result.publish.status).toBe('success');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: home.hero.title })).toBeVisible();
    await expect(page.getByText('Cambio descartado por restauración')).toHaveCount(0);
  });
});
