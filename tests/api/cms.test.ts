import { beforeAll, afterAll, test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { findCertificates } from '../../src/lib/certificate-crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { SignJWT } from '../../cms/node_modules/jose';
import {
  createSandbox,
  credentials,
  jwtSecret,
  assertOutsideRepo,
  command,
  repo,
} from '../helpers/sandbox';
import { contentSchemas } from '../../cms/src/content/schemas';
import { deriveCertificateSecrets } from '../../cms/src/certificates/crypto';

let s: Awaited<ReturnType<typeof createSandbox>>;
beforeAll(async () => {
  s = await createSandbox();
}, 30_000);
afterAll(async () => {
  await s?.close();
}, 30_000);
async function json(path: string, method = 'GET', body?: unknown, status = 200) {
  const res = await s.request(path, method, body);
  const value = await res.json();
  expect({ status: res.status, error: value.error }).toEqual({
    status,
    error: status < 400 ? undefined : value.error,
  });
  return value;
}
test('API-01 [CMS-00] aislamiento y push bloqueado', async () => {
  assertOutsideRepo(s.landing);
  expect(() => assertOutsideRepo(process.cwd())).toThrow();
  expect(await readFile(join(s.landing, '.git/config'), 'utf8')).toContain('PUSH-BLOQUEADO');
});
test('API-02 salud', async () => {
  expect((await json('/api/health')).status).toBe('ok');
});
test('API-03 [CMS-02] sesión y cookie protegida', async () => {
  expect((await json('/api/auth/me')).user.email).toBe(credentials.email);
  const r = await s.request('/api/auth/login', 'POST', credentials, false);
  expect(r.status).toBe(200);
  expect(r.headers.get('set-cookie')).toContain('HttpOnly');
  expect(r.headers.get('set-cookie')).toContain('SameSite=Strict');
});
test('API-04 [CMS-02] clave incorrecta y cuerpo incompleto', async () => {
  expect(
    (await s.request('/api/auth/login', 'POST', { ...credentials, password: 'incorrecta' }, false))
      .status
  ).toBe(401);
  expect((await s.request('/api/auth/login', 'POST', {}, false)).status).toBe(400);
});
test('API-USERS [CMS-02] crea administradores, rechaza duplicado y limita a cinco', async () => {
  await json('/api/auth/users', 'POST', {}, 400);
  const account = {
    email: 'otro@example.test',
    password: 'Clave ficticia2026!',
    name: 'Otro administrador',
  };
  await json('/api/auth/users', 'POST', account, 201);
  await json('/api/auth/users', 'POST', account, 400);
  const login = await s.request('/api/auth/login', 'POST', account, false);
  expect(login.status).toBe(200);
  for (let i = 0; i < 3; i++)
    await json('/api/auth/users', 'POST', { ...account, email: `admin${i}@example.test` }, 201);
  await json('/api/auth/users', 'POST', { ...account, email: 'sexto@example.test' }, 400);
});
const protectedRoutes: Array<[string, string]> = [
  ['GET', '/api/auth/me'],
  ['POST', '/api/auth/users'],
  ['GET', '/api/content'],
  ['PUT', '/api/content/home.json'],
  ['POST', '/api/content/custom-pages/create'],
  ['PUT', '/api/content/navigation-links/status'],
  ['PUT', '/api/content/custom-pages/x/status'],
  ['PUT', '/api/content/custom-pages/x'],
  ['DELETE', '/api/content/custom-pages/x'],
  ['GET', '/api/blog'],
  ['GET', '/api/blog/x'],
  ['POST', '/api/blog'],
  ['PUT', '/api/blog/x'],
  ['DELETE', '/api/blog/x'],
  ['GET', '/api/media'],
  ['POST', '/api/media/upload'],
  ['GET', '/api/media/file/x.png'],
  ['DELETE', '/api/media/x.png'],
  ['GET', '/api/snapshots'],
  ['POST', '/api/snapshots'],
  ['POST', '/api/snapshots/upload'],
  ['GET', '/api/snapshots/1'],
  ['GET', '/api/snapshots/1/download'],
  ['POST', '/api/snapshots/1/restore'],
  ['DELETE', '/api/snapshots/1'],
  ['GET', '/api/publish/status'],
  ['GET', '/api/publish/changes'],
  ['GET', '/api/publish/schedule'],
  ['POST', '/api/publish/schedule'],
  ['DELETE', '/api/publish/schedule/1'],
  ['POST', '/api/publish'],
  ['GET', '/api/preview/status'],
  ['POST', '/api/preview/start'],
  ['POST', '/api/preview/stop'],
  ['POST', '/api/preview/sync'],
  ['POST', '/api/preview/draft'],
  ['POST', '/api/preview/draft/cleanup'],
  ['POST', '/api/preview/blog-draft'],
  ['POST', '/api/preview/blog-draft/cleanup'],
  ['POST', '/api/preview/snapshot/1'],
  ['POST', '/api/preview/snapshot/cleanup'],
  ['GET', '/api/certificates'],
  ['PUT', '/api/certificates/source'],
  ['POST', '/api/certificates/sync'],
  ['DELETE', '/api/certificates/contests/x'],
  ['POST', '/api/certificates/manual'],
  ['DELETE', '/api/certificates/manual/x'],
  ['GET', '/api/certificates/schools'],
];
for (const [method, path] of protectedRoutes)
  test(`AUTH [CMS-02] ${method} ${path} exige sesión`, async () => {
    expect((await s.request(path, method, method === 'GET' ? undefined : {}, false)).status).toBe(
      401
    );
  });
for (const kind of ['expired', 'altered', 'missing-user'])
  test(`API-JWT [CMS-02] rechaza ${kind}`, async () => {
    let token = await new SignJWT({ email: credentials.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(kind === 'missing-user' ? '9999' : '1')
      .setExpirationTime(kind === 'expired' ? 1 : '1h')
      .sign(new TextEncoder().encode(jwtSecret));
    if (kind === 'altered') token = `${token.slice(0, -8)}xxxxxxxx`;
    expect(
      (await fetch(`${s.url}/api/auth/me`, { headers: { cookie: `cms_test_token=${token}` } }))
        .status
    ).toBe(401);
  });
for (const filename of Object.keys(contentSchemas)) {
  test(`CONTENT [CMS-03] lee ${filename}`, async () => {
    expect(contentSchemas[filename].safeParse(await json(`/api/content/${filename}`)).success).toBe(
      true
    );
  });
  if (filename !== 'custom-pages.json')
    test(`CONTENT [CMS-03-01] valida ${filename} sin tocar archivo`, async () => {
      const previous = await readFile(join(s.content, 'current/data', filename), 'utf8').catch(
        () => null
      );
      const invalid = await s.request(`/api/content/${filename}`, 'PUT', null);
      expect(invalid.status).toBe(400);
      expect(
        await readFile(join(s.content, 'current/data', filename), 'utf8').catch(() => null)
      ).toBe(previous);
    });
  if (!['custom-pages.json', 'navigation.json'].includes(filename))
    test(`SAVE [CMS-03] guardar ${filename} válido`, async () => {
      const data = await json(`/api/content/${filename}`);
      await json(`/api/content/${filename}`, 'PUT', data);
      expect(
        contentSchemas[filename].safeParse(await json(`/api/content/${filename}`)).success
      ).toBe(true);
    });
}
test('API-05 [CMS-03] guarda UTF8 y sincroniza texto', async () => {
  const data = await json('/api/content/contact.json');
  data.header.heading = 'Información de prueba: ñ, á, ü\nSegunda línea';
  await json('/api/content/contact.json', 'PUT', data);
  expect((await json('/api/content/contact.json')).header.heading).toBe(data.header.heading);
  expect(
    JSON.parse(await readFile(join(s.landing, 'src/data/contact.json'), 'utf8')).header.heading
  ).toBe(data.header.heading);
});
test('API-06 [CMS-03] CRUD página personalizada y navegación', async () => {
  const { page } = await json(
    '/api/content/custom-pages/create',
    'POST',
    { title: 'Página de pruebas' },
    201
  );
  await json('/api/content/custom-pages/create', 'POST', { title: 'Página de pruebas' }, 409);
  await json(`/api/content/custom-pages/${page.id}`, 'PUT', {
    ...page,
    header: { ...page.header, subtitle: 'Editada' },
  });
  await json(`/api/content/custom-pages/${page.id}/status`, 'PUT', { active: false });
  expect(
    (await json('/api/content/custom-pages.json')).pages.find(
      (p: { id: string; active: boolean }) => p.id === page.id
    ).active
  ).toBe(false);
  await json(`/api/content/custom-pages/${page.id}`, 'DELETE');
  expect(
    (await json('/api/content/navigation.json')).links.some(
      (l: { href: string }) => l.href === `/${page.slug}`
    )
  ).toBe(false);
});
const frontmatter = {
  title: 'Publicación ficticia',
  description: 'Descripción de prueba',
  date: '2026-09-29',
  author: 'Pruebas',
};
test('API-07 [CMS-05 CMS-06] blog CRUD', async () => {
  await json(
    '/api/blog',
    'POST',
    { slug: 'prueba-api', frontmatter, body: '## Texto\nNiñez y educación' },
    201
  );
  const changes = await json('/api/publish/changes');
  expect(changes.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ file: 'prueba-api.md', status: 'added', type: 'blog' }),
    ])
  );
  await json('/api/blog', 'POST', { slug: 'prueba-api', frontmatter, body: 'duplicado' }, 409);
  expect((await json('/api/blog/prueba-api')).body).toContain('Niñez');
  await json('/api/blog/prueba-api', 'PUT', {
    frontmatter: { ...frontmatter, title: 'Editada' },
    body: '**Editado**',
  });
  expect((await json('/api/blog/prueba-api')).frontmatter.title).toBe('Editada');
  await json('/api/blog/prueba-api', 'DELETE');
  await json('/api/blog/prueba-api', 'GET', undefined, 404);
});
for (const slug of ['../escape', 'MAYUSCULAS', 'con espacio', 'cms-preview'])
  test(`BLOG [CMS-05] slug inválido ${slug}`, async () => {
    await json('/api/blog', 'POST', { slug, frontmatter, body: 'x' }, 400);
  });
test('API-08 [CMS-08] borrador blog y limpieza', async () => {
  await json('/api/preview/blog-draft', 'POST', {
    slug: 'borrador',
    frontmatter,
    body: 'Borrador ñ',
    usePreviewSlug: true,
  });
  expect(await readFile(join(s.landing, 'src/content/blog/cms-preview.md'), 'utf8')).toContain(
    'Borrador ñ'
  );
  await json('/api/preview/blog-draft/cleanup', 'POST');
  expect(await Bun.file(join(s.landing, 'src/content/blog/cms-preview.md')).exists()).toBe(false);
});
test('API-09 [CMS-04] borrador sin guardar y cleanup', async () => {
  const data = await json('/api/content/contact.json');
  await json('/api/preview/draft', 'POST', {
    filename: 'contact.json',
    data: { ...data, header: { ...data.header, heading: 'BORRADOR' } },
  });
  expect(
    JSON.parse(await readFile(join(s.landing, 'src/data/contact.json'), 'utf8')).header.heading
  ).toBe('BORRADOR');
  expect((await json('/api/content/contact.json')).header.heading).toBe(data.header.heading);
  await json('/api/preview/draft/cleanup', 'POST', { filename: 'contact.json' });
  expect(
    JSON.parse(await readFile(join(s.landing, 'src/data/contact.json'), 'utf8')).header.heading
  ).toBe(data.header.heading);
});
test('API-10 [CMS-07] subir SVG seguro leer y borrar', async () => {
  const form = new FormData();
  form.append(
    'file',
    new Blob(
      [
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="5" height="5"/></svg>',
      ],
      { type: 'image/svg+xml' }
    ),
    'prueba.svg'
  );
  const { filename } = await json('/api/media/upload', 'POST', form, 201);
  expect(await (await s.request(`/api/media/file/${filename}`)).text()).not.toContain('<script');
  await json(`/api/media/${filename}`, 'DELETE');
});
test('API-11 [CMS-07] rechaza archivo vacío', async () => {
  const form = new FormData();
  form.append('file', new Blob([]), 'vacio.png');
  expect((await s.request('/api/media/upload', 'POST', form)).status).toBe(400);
});
for (const kind of ['extension', 'oversize'])
  test(`MEDIA [CMS-07] rechaza ${kind}`, async () => {
    const form = new FormData();
    form.append(
      'file',
      new Blob([kind === 'oversize' ? new Uint8Array(5 * 1024 * 1024 + 1) : 'mal']),
      kind === 'extension' ? 'invalido.exe' : 'grande.png'
    );
    const response = await s.request('/api/media/upload', 'POST', form);
    expect(response.status).toBe(kind === 'oversize' ? 413 : 400);
    expect((await response.json()).error).toBeTruthy();
  });
for (const filename of ['..%5Ccms.sqlite', '..%2Fcms.sqlite'])
  test(`MEDIA [CMS-07] traversal ${filename}`, async () => {
    await json(`/api/media/file/${filename}`, 'GET', undefined, 400);
  });
test('API-12 [CMS-09 CMS-10 CMS-11] respaldo exportar importar restaurar borrar', async () => {
  const original = await json('/api/content/contact.json');
  const snap = await json('/api/snapshots', 'POST', { description: 'Respaldo ñ' }, 201);
  expect(snap.author).toBe('Pruebas');
  expect(snap.description).toBe('Respaldo ñ');
  expect(Math.abs(Date.now() - Date.parse(snap.createdAt))).toBeLessThan(60_000);
  expect((await json(`/api/snapshots/${snap.id}`)).meta ?? snap).toBeTruthy();
  const archive = await s.request(`/api/snapshots/${snap.id}/download`);
  expect(archive.status).toBe(200);
  const form = new FormData();
  form.append('file', new Blob([await archive.arrayBuffer()]), 'respaldo.gz');
  const imported = await json('/api/snapshots/upload', 'POST', form, 201);
  await json('/api/content/contact.json', 'PUT', {
    ...original,
    header: { ...original.header, heading: 'CAMBIO RESTAURABLE' },
  });
  await json(`/api/snapshots/${snap.id}/restore`, 'POST');
  expect((await json('/api/content/contact.json')).header.heading).toBe(original.header.heading);
  await json('/api/content/contact.json', 'PUT', {
    ...original,
    header: { ...original.header, heading: 'Restaurar importado' },
  });
  await json(`/api/snapshots/${imported.snapshot.id}/restore`, 'POST');
  expect((await json('/api/content/contact.json')).header.heading).toBe(original.header.heading);
  await json(`/api/snapshots/${snap.id}`, 'DELETE');
  await json(`/api/snapshots/${imported.snapshot.id}`, 'DELETE');
});
test('API-SNAPSHOT [CMS-10 CMS-11] rechaza respaldo corrupto e inexistente', async () => {
  const form = new FormData();
  form.append('file', new Blob(['no es un respaldo']), 'invalido.gz');
  await json('/api/snapshots/upload', 'POST', form, 400);
  await json('/api/snapshots/999999/restore', 'POST', undefined, 404);
});
test('API-ORDER [CMS-03-03] conserva el nuevo orden de componentes al guardar', async () => {
  const data = await json('/api/content/estudiantes.json');
  expect(data.components.length).toBeGreaterThan(1);
  const components = [...data.components].reverse();
  await json('/api/content/estudiantes.json', 'PUT', { ...data, components });
  expect((await json('/api/content/estudiantes.json')).components).toEqual(components);
  await json('/api/content/estudiantes.json', 'PUT', data);
});
test('API-13 [CMS-13] programar listar cancelar y fecha inválida', async () => {
  const scheduled = await json('/api/publish/schedule', 'POST', {
    runAt: new Date(Date.now() + 3_600_000).toISOString(),
  });
  expect(JSON.stringify(await json('/api/publish/schedule'))).toContain(
    String(scheduled.scheduled.id)
  );
  await json(`/api/publish/schedule/${scheduled.scheduled.id}`, 'DELETE');
  await json('/api/publish/schedule', 'POST', { runAt: 'ayer' }, 400);
});
test('API-14 certificados manuales únicos cifrados e invalidación', async () => {
  const codes = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const value = await json(
      '/api/certificates/manual',
      'POST',
      {
        name: `Persona Inventada ${i}`,
        department: 'cochabamba',
        contest: 'Desafío ficticio',
        year: 2026,
        distinction: 'participation',
      },
      201
    );
    expect(value.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    expect(codes.has(value.code)).toBe(false);
    codes.add(value.code);
    const { fileId } = await deriveCertificateSecrets(value.code);
    const file = join(s.landing, 'public/certificados', `${fileId}.json`);
    const raw = await readFile(file, 'utf8');
    expect(raw).not.toContain('Persona Inventada');
    expect(raw).not.toContain(value.code);
    await json(`/api/certificates/manual/${value.code}`, 'DELETE');
    expect(await Bun.file(file).exists()).toBe(false);
  }
});
test('API-CERT lugar manual y compatibilidad con certificados antiguos', async () => {
  const base = {
    name: 'Persona de prueba',
    contest: 'Desafío de prueba',
    year: 2026,
    distinction: 'participation',
  };
  for (const department of [undefined, '', null, 'inexistente']) {
    expect(
      (await json('/api/certificates/manual', 'POST', { ...base, department }, 400)).error
    ).toBe('Elige el departamento.');
  }
  const db = new Database(join(s.content, 'cms.sqlite'));
  const legacyCode = 'LEGACY23';
  const legacySecrets = await deriveCertificateSecrets(legacyCode);
  const legacyData = {
    contest: base.contest,
    year: 2026,
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
  };
  db.query('INSERT INTO manual_certificates (code, data, file_id, secret) VALUES (?, ?, ?, ?)').run(
    legacyCode,
    JSON.stringify(legacyData),
    legacySecrets.fileId,
    legacySecrets.secret
  );
  const realFetch = globalThis.fetch;
  async function decrypted(code: string) {
    const { fileId } = await deriveCertificateSecrets(code);
    const raw = await readFile(join(s.landing, 'public/certificados', `${fileId}.json`), 'utf8');
    expect(raw).not.toContain('Persona');
    expect(raw).not.toContain('Colegio');
    globalThis.fetch = Object.assign(
      async () => new Response(raw, { headers: { 'content-type': 'application/json' } }),
      { preconnect: realFetch.preconnect }
    );
    try {
      return await findCertificates(code);
    } finally {
      globalThis.fetch = realFetch;
    }
  }
  try {
    const schools = await json('/api/certificates/schools?q=bolivia&dep=cochabamba');
    expect(schools.length).toBeGreaterThan(0);
    const selected = schools[0];
    for (const fields of [
      {},
      { school: '' },
      { school: '  Colegio   Ñandú Independiente  ', place: '' },
      { schoolCode: selected.code, department: selected.department, place: selected.city },
    ]) {
      const created = await json(
        '/api/certificates/manual',
        'POST',
        { ...base, department: 'cochabamba', ...fields },
        201
      );
      const row = db
        .query('SELECT data FROM manual_certificates WHERE code = ?')
        .get(created.code) as { data: string };
      const stored = JSON.parse(row.data);
      expect(stored.school).toBe(
        'schoolCode' in fields
          ? selected.name
          : fields.school
            ? 'Colegio Ñandú Independiente'
            : null
      );
      expect(stored.place).toBe('schoolCode' in fields ? selected.city : null);
      expect(stored.department).toBe('cochabamba');
      expect(await decrypted(created.code)).toEqual([stored]);
      await json(`/api/certificates/manual/${created.code}`, 'DELETE');
    }
    expect(
      (await json('/api/certificates')).manual.some(
        (item: { code: string }) => item.code === legacyCode
      )
    ).toBe(true);
    expect(await decrypted(legacyCode)).toEqual([legacyData]);
    expect(
      (
        await json(
          '/api/certificates/manual',
          'POST',
          { ...base, department: 'cochabamba', school: 'a'.repeat(161) },
          400
        )
      ).error
    ).toBe('El nombre del colegio no puede superar los 160 caracteres.');
    await json(
      '/api/certificates/manual',
      'POST',
      { ...base, department: 'cochabamba', schoolCode: 'inexistente' },
      400
    );
  } finally {
    db.close();
    await json(`/api/certificates/manual/${legacyCode}`, 'DELETE');
  }
});

test('API-CERT actualización falsa conserva desafíos ausentes y reemplaza recibidos', async () => {
  const certificate = (code: string, contestId: string) => ({
    code,
    contestId,
    participants: ['Persona Inventada Importada'],
    category: 'Kuntur',
    grade: null,
    school: null,
    place: null,
    department: null,
    score: 10,
    correct: 2,
    questions: 3,
    rank: 1,
    rankOf: 20,
  });
  let payload = {
    version: 1,
    contests: [{ id: 'anterior', title: 'Anterior ficticio', year: 2025 }],
    certificates: [certificate('ABCDEFGH', 'anterior')],
  };
  let forbidden = false;
  const server = createServer((_req, res) => {
    res
      .writeHead(forbidden ? 401 : 200, { 'content-type': 'application/json' })
      .end(JSON.stringify(payload));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  try {
    const port = (server.address() as { port: number }).port;
    await json('/api/certificates/source', 'PUT', {
      url: `http://127.0.0.1:${port}/api/certificates/export?key=clave-ficticia`,
    });
    expect((await json('/api/certificates/sync', 'POST')).received).toBe(1);
    payload = {
      version: 1,
      contests: [{ id: 'nuevo', title: 'Nuevo ficticio', year: 2026 }],
      certificates: [certificate('JKMNPQRS', 'nuevo')],
    };
    const updated = await json('/api/certificates/sync', 'POST');
    expect(updated.total).toBe(2);
    payload.certificates = [];
    expect((await json('/api/certificates/sync', 'POST')).total).toBe(1);
    const files = await readdir(join(s.landing, 'public/certificados'));
    expect(files).toHaveLength(1);
    expect(await readFile(join(s.landing, 'public/certificados', files[0]), 'utf8')).not.toContain(
      'Persona Inventada'
    );
    forbidden = true;
    await json('/api/certificates/sync', 'POST', undefined, 502);
    expect((await json('/api/certificates')).total).toBe(1);
    await json('/api/certificates/contests/anterior', 'DELETE');
    await json('/api/certificates/contests/nuevo', 'DELETE');
  } finally {
    await new Promise<void>((done) => server.close(() => done()));
  }
});
test('API-RET [CMS-09] retención borra automático duplicado y conserva manual', async () => {
  const isolated = await createSandbox();
  try {
    const result = await command(
      process.execPath,
      [join(repo, 'tests/helpers/retention.ts')],
      isolated.root,
      {
        ...process.env,
        NODE_ENV: 'development',
        JWT_SECRET: jwtSecret,
        ADMIN_PASSWORD: credentials.password,
        CONTENT_DIR: isolated.content,
        LANDING_DIR: isolated.landing,
        LANDING_DATA_DIR: join(isolated.landing, 'src/data'),
        LANDING_BLOG_DIR: join(isolated.landing, 'src/content/blog'),
        LANDING_PUBLIC_DIR: join(isolated.landing, 'public'),
      }
    );
    expect(result).toContain('RETENCION OK');
  } finally {
    await isolated.close();
  }
}, 30_000);
for (const url of [
  'javascript:alert(1)',
  'https://example.test/wrong',
  'https://example.test/api/certificates/export',
])
  test(`CERT source inválida ${url}`, async () => {
    await json('/api/certificates/source', 'PUT', { url }, 400);
  });
test('API-15 [CMS-02] logout expira cookie', async () => {
  const r = await s.request('/api/auth/logout', 'POST');
  expect(r.headers.get('set-cookie')).toContain('Expires=Thu, 01 Jan 1970');
});
test('API-16 [CMS-02] X-Forwarded-For no evade límite', async () => {
  const isolated = await createSandbox();
  try {
    const statuses = [];
    for (let i = 0; i < 10; i++)
      statuses.push(
        (
          await fetch(`${isolated.url}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${i}` },
            body: JSON.stringify({ ...credentials, password: 'mal' }),
          })
        ).status
      );
    expect(statuses.at(-1)).toBe(429);
  } finally {
    await isolated.close();
  }
}, 30_000);
