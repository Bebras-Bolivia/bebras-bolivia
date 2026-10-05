import { test, expect, type Page } from '@playwright/test';
import { createSandbox, credentials } from '../helpers/sandbox';
import { createServer } from 'node:http';

let sandbox: Awaited<ReturnType<typeof createSandbox>>;
test.describe.configure({ mode: 'default' });
test.beforeAll(async () => {
  test.setTimeout(240_000);
  sandbox = await createSandbox();
});
test.afterAll(async () => {
  await sandbox?.close();
});
async function authenticated(page: Page) {
  const [name, ...value] = sandbox.cookie.split(';')[0].split('=');
  await page.context().addCookies([{ name, value: value.join('='), url: sandbox.url }]);
}
async function open(page: Page, route: string) {
  await authenticated(page);
  await page.goto(`${sandbox.url}${route}`, { waitUntil: 'domcontentloaded' });
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
}
const image = {
  name: 'prueba.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'base64'
  ),
};
const logoImage = {
  name: 'prueba.svg',
  mimeType: 'image/svg+xml',
  buffer: Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#324C87"/></svg>'
  ),
};

test('CMS-01 sesión obligatoria', async ({ page }) => {
  await page.goto(sandbox.url);
  await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
});
test('CMS-02 contraseña incorrecta', async ({ page }) => {
  await page.goto(`${sandbox.url}/login.html`);
  await page.getByLabel('Correo electrónico').fill(credentials.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.locator('#login-error')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
});
test('CMS-03 ingresar, mostrar contraseña y salir', async ({ page }) => {
  await page.goto(`${sandbox.url}/login.html`);
  await page.getByLabel('Correo electrónico').fill(credentials.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesion', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
});
test('CMS-04 texto UTF-8 persiste al recargar', async ({ page }) => {
  await open(page, '/editor/home.json/hero');
  await page
    .getByLabel('Subtítulo principal', { exact: true })
    .fill('Pruebas: ñandú, educación y desafío');
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/api/content/home.json') && r.request().method() === 'PUT'
  );
  await page.getByRole('button', { name: 'Publicar ahora', exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Subtítulo principal', { exact: true })).toHaveValue(
    'Pruebas: ñandú, educación y desafío'
  );
});
test('CMS-05 editar enlace y programar', async ({ page }) => {
  await open(page, '/editor/home.json/hero');
  await page.getByLabel('URL del botón', { exact: true }).fill('/contacto');
  await page.getByRole('button', { name: 'Programar publicación', exact: true }).click();
  await expect(page.getByLabel('Fecha y hora')).toBeVisible();
  await page.getByRole('button', { name: 'Programar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Publicación programada', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar programación', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancelar programación', exact: true })
    .click();
  await expect(page.getByText('Programación cancelada', { exact: true })).toBeVisible();
});
test('CMS-06 crear blog con imagen, editar y borrar', async ({ page }) => {
  await open(page, '/blog');
  await page.getByRole('button', { name: 'Nueva publicación' }).click();
  await page.getByLabel('Titulo', { exact: true }).fill('Noticia automatizada');
  await page
    .getByLabel('Descripcion', { exact: true })
    .fill('Descripción con tildes para la prueba.');
  await page
    .getByLabel('Contenido (Markdown)', { exact: true })
    .fill('## Educación\n\nUna noticia de prueba.\n');
  await page.getByRole('button', { name: 'Insertar imagen', exact: true }).click();
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles(image);
  await page.getByLabel('Nombre visible / alt').fill('Castor de prueba');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Insertar', exact: true }).click();
  await expect(page.getByLabel('Contenido (Markdown)', { exact: true })).toHaveValue(
    /Castor de prueba/
  );
  await page.getByRole('button', { name: 'Crear publicación', exact: true }).click();
  await expect(page.getByText('Publicacion creada', { exact: true })).toBeVisible();
  await expect(
    page
      .frameLocator('iframe[title="Vista previa del post"]')
      .getByRole('heading', { name: 'Noticia automatizada', exact: true })
  ).toBeVisible({ timeout: 60_000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Titulo', { exact: true })).toHaveValue('Noticia automatizada');
  await page.getByLabel('Descripcion', { exact: true }).fill('Descripción editada.');
  await page.getByRole('button', { name: 'Guardar publicación' }).click();
  await expect(page.getByText('Publicacion guardada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Volver a noticias' }).click();
  await page.getByRole('button', { name: 'Eliminar Noticia automatizada' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar Noticia automatizada' })).toHaveCount(0);
});
test('CMS-07 crear, restaurar y borrar respaldo', async ({ page }) => {
  await open(page, '/snapshots');
  await page.getByRole('button', { name: 'Crear respaldo', exact: true }).click();
  await page.getByLabel('Nombre del respaldo').fill('Respaldo automatizado');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Crear respaldo', exact: true })
    .click();
  await expect(page.getByText('Respaldo creado', { exact: true })).toBeVisible();
  const row = page.locator('.snapshot-item').filter({ hasText: 'Respaldo automatizado' });
  await row.getByRole('button', { name: /Ver respaldo/ }).click();
  await expect(page.locator('iframe[title^="Vista previa del respaldo"]')).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole('button', { name: 'Cerrar vista previa' }).click();
  await expect(page.locator('iframe[title^="Vista previa del respaldo"]')).toHaveCount(0);
  await row.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(page.getByText(/Respaldo #.* restaurado/)).toBeVisible();
  await row.getByRole('button', { name: /Eliminar respaldo/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(row).toHaveCount(0);
});
test('CMS-10 pegar fuente de exportación y actualizar certificados', async ({ page }) => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        version: 1,
        contests: [{ id: 'prueba-ui', title: 'Desafío importado', year: 2026 }],
        certificates: [
          {
            code: 'PRUEBAUI',
            contestId: 'prueba-ui',
            participants: ['Persona Exportada'],
            category: 'Kuntur',
            grade: null,
            school: null,
            place: null,
            department: null,
            score: 80,
            correct: 8,
            questions: 10,
            rank: 1,
            rankOf: 20,
          },
        ],
      })
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await open(page, '/certificados');
    await page
      .getByLabel('Enlace de certificados')
      .fill(
        `http://127.0.0.1:${(server.address() as { port: number }).port}/api/certificates/export?key=prueba`
      );
    await page.getByRole('button', { name: 'Guardar', exact: true }).first().click();
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Desafío importado', exact: true })
    ).toBeVisible();
    expect((await (await sandbox.request('/api/certificates')).json()).contests).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'prueba-ui', count: 1 })])
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
test('CMS-08 certificado individual y enlace de verificación', async ({ page }) => {
  await open(page, '/certificados');
  await page.getByRole('button', { name: 'Agregar persona' }).click();
  await page.getByLabel('Nombre completo').fill('Persona Inventada');
  await page.getByLabel('Departamento', { exact: true }).selectOption('cochabamba');
  await page.getByLabel('Desafío', { exact: true }).fill('Desafío de prueba');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Certificado de Persona Inventada' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir', exact: true }).first()).toHaveAttribute(
    'href',
    /certificado\?codigo=[A-Z2-9]{8}/
  );
});
test('CMS-CERT recorrido real de certificados manuales y sitio en puerto 4100', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const admin = { email: 'admin@bebras.bo', password: 'admin123' };
  const local = await createSandbox({ port: 4100, admin });
  try {
    await page.goto(`${local.url}/login.html`);
    await page.getByLabel('Correo electrónico').fill(admin.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(admin.password);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login.html'));
    await page.goto(`${local.url}/certificados`);
    await page.getByRole('button', { name: 'Agregar persona' }).click();
    await page.getByLabel('Nombre completo').fill('Persona sin departamento');
    await page.getByLabel('Desafío', { exact: true }).fill('Desafío de prueba');
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await expect(page.locator('#manual-department')).toHaveJSProperty(
      'validationMessage',
      'Elige el departamento.'
    );
    expect((await (await local.request('/api/certificates')).json()).total).toBe(0);
    const cases = [
      { name: 'Persona sin colegio', school: '', department: 'cochabamba', label: 'Cochabamba' },
      {
        name: 'Persona colegio libre',
        school: '  Colegio   Ñandú Independiente  ',
        department: 'la-paz',
        label: 'La Paz',
      },
      { name: 'Persona del catálogo', school: null, department: 'cochabamba', label: 'Cochabamba' },
    ];
    const created: Array<{ code: string; name: string; school: string; label: string }> = [];
    for (const item of cases) {
      await page.getByLabel('Nombre completo').fill(item.name);
      await page.getByLabel('Departamento', { exact: true }).selectOption(item.department);
      let school = item.school?.replace(/\s+/g, ' ').trim() ?? '';
      await page.getByLabel('Colegio (opcional)').fill(item.school ?? 'Bolivia');
      if (item.school === null) {
        const option = page
          .getByRole('option')
          .filter({ has: page.locator('div') })
          .first();
        await expect(option).toBeVisible();
        school = (await option.locator('div').first().innerText()).trim();
        await option.click();
        await expect(page.locator('#manual-department')).toHaveValue('cochabamba');
        expect(await page.locator('#manual-place').inputValue()).not.toBe('');
      } else {
        await page.getByLabel('Ciudad (opcional)').selectOption('');
      }
      const response = page.waitForResponse(
        (res) => res.url().endsWith('/api/certificates/manual') && res.request().method() === 'POST'
      );
      await page.getByRole('button', { name: 'Agregar', exact: true }).click();
      const result = await response;
      expect(result.status()).toBe(201);
      const { code } = await result.json();
      await expect(
        page.getByRole('heading', { name: `Certificado de ${item.name}`, exact: true })
      ).toBeVisible();
      created.push({ code, name: item.name, school, label: item.label });
    }
    await local.build();
    for (const item of created) {
      await page.goto(`${local.siteUrl}/certificado?codigo=${item.code}`);
      const sheet = page.locator('.certificate-sheet');
      await expect(sheet).toBeVisible();
      await expect(sheet).toContainText(item.name);
      await expect(sheet).toContainText(item.label);
      if (item.school) await expect(sheet).toContainText(item.school);
      await expect(sheet).not.toContainText('null');
      await expect(sheet).not.toContainText('undefined');
      await sheet.screenshot({ path: test.info().outputPath(`${item.code}.png`) });
    }
  } finally {
    await local.close();
  }
});

test('CMS-09 subir logos, reordenar, limitar tamaño y conservarlos', async ({ page }) => {
  expect((await sandbox.request('/api/content/certificate.json', 'PUT', { logos: [] })).ok).toBe(
    true
  );
  await open(page, '/certificados');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Agregar logo' }).click();
  await (await chooser).setFiles(logoImage);
  await page.getByLabel('Nombre de la institución').fill('Institución de prueba');
  await page.getByRole('slider', { name: 'Tamaño', exact: true }).focus();
  await page.getByRole('slider', { name: 'Tamaño', exact: true }).press('Home');
  await page.getByRole('slider', { name: 'Tamaño', exact: true }).press('ArrowRight');
  const secondChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Agregar logo' }).click();
  await (await secondChooser).setFiles({ ...logoImage, name: 'segunda.svg' });
  await expect(page.getByLabel('Nombre de la institución')).toHaveValue('segunda');
  await page.getByLabel('Nombre de la institución').fill('Segunda institución');
  await page
    .getByRole('button', { name: 'Logo Segunda institución', exact: true })
    .press('ArrowLeft');
  const wideChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Agregar logo' }).click();
  await (
    await wideChooser
  ).setFiles({
    name: 'muy-ancho.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10000" height="1"><rect width="10000" height="1" fill="red"/></svg>'
    ),
  });
  await expect(
    page.getByText('Ya no entra otro logo sin chocar con el sello. Achica o quita alguno.', {
      exact: true,
    })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Guardar', exact: true }).last().click();
  await expect(
    page.getByText('Logos guardados. El sitio se publicará en unos segundos.', { exact: true })
  ).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('button', { name: 'Logo Institución de prueba', exact: true })
  ).toBeVisible();
  const saved = await (await sandbox.request('/api/content/certificate.json')).json();
  expect(saved.logos.map((logo: { alt: string }) => logo.alt)).toEqual([
    'Segunda institución',
    'Institución de prueba',
  ]);
  expect(saved.logos[1].height).toBeCloseTo(2.1, 1);
});
test('CMS-11 árbol de contenido abre el editor', async ({ page }) => {
  await open(page, '/blog');
  await page.getByRole('link', { name: 'Inicio', exact: true }).click();
  await expect(page.getByLabel('Subtítulo principal', { exact: true })).toBeVisible();
});
test('CMS-12 reordenar y agregar sección del inicio', async ({ page }) => {
  const original = await (await sandbox.request('/api/content/home.json')).json();
  await open(page, '/editor/home.json');
  const sections = page.locator('[data-array-path="sections"]');
  const cards = sections.locator(':scope > [draggable="true"]');
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await cards.first().dispatchEvent('dragstart', { dataTransfer: transfer });
  await cards.last().dispatchEvent('dragover', { dataTransfer: transfer });
  await cards.last().dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.getByRole('button', { name: 'Publicar ahora', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Publicar ahora', exact: true }).click();
  await expect
    .poll(async () =>
      (await (await sandbox.request('/api/content/home.json')).json()).sections.map(
        (section: { type: string }) => section.type
      )
    )
    .toEqual([
      ...original.sections.slice(1).map((section: { type: string }) => section.type),
      original.sections[0].type,
    ]);
  await sections.locator('..').locator(':scope > button.add-item-btn').click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Texto editorial/ })
    .click();
  await page.getByRole('button', { name: 'Publicar ahora', exact: true }).click();
  await expect
    .poll(
      async () => (await (await sandbox.request('/api/content/home.json')).json()).sections.length
    )
    .toBe(original.sections.length + 1);
});
for (const width of [390, 1280]) {
  for (const route of ['/blog', '/publish', '/snapshots', '/certificados']) {
    test(`CMS diseño ${route} a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, route);
      await expect(page.getByRole('main')).not.toContainText('Cargando...');
      await noOverflow(page);
    });
  }
}
